# Task 10B: MyBondCard — 读取并展示用户 Bond 状态

> **范围**：在 leader detail 页面展示当前钱包对当前 leader 的 MyBondCard。只读展示，不做 refund/slash/settle 交互。

## 1. 目标

实现以下功能：

1. 读取当前钱包在 CopyGuardBondVault 中创建的所有 bond
2. 过滤出属于当前 leader 的 bond
3. 在 `/leaders/[id]` 页面展示 MyBondCard
4. 处理三种状态：未连接钱包、已连接但无 bond、已连接且有 bond

## 2. 合约分析（关键）

CopyGuardBondVault 合约结构：

```solidity
mapping(uint256 => Bond) public bonds;   // bondId → Bond
uint256 public nextBondId;               // 下一个 bondId（从 1 开始）
```

**没有** `(follower, leaderId) → bondId` 的反向映射。

### 读取策略

1. 调用 `nextBondId()` 获取当前 bond 总数（返回值 = 最大 bondId + 1）
2. 使用 wagmi `useReadContracts`（multicall）批量读取 `bonds(1)` 到 `bonds(nextBondId - 1)`
3. 过滤结果：`follower == userAddress` AND `leaderId == expectedLeaderIdBytes32`
4. 如果找到匹配 bond，展示 MyBondCard

**注意**：
- 使用 `useReadContracts`（单次 multicall），**不要**在循环中调用 `useReadContract`
- MVP 阶段 bond 数量很少（测试网），批量读取完全可行
- 如果 nextBondId 为 1（无 bond），直接返回空

### Bond struct 返回值（按合约顺序）

```typescript
// bonds(bondId) 返回元组：
[id: bigint,          // uint256
 follower: `0x${string}`, // address
 leaderId: `0x${string}`, // bytes32
 amount: bigint,      // uint256
 createdAt: bigint,   // uint256
 expiry: bigint,      // uint256
 riskThresholdBps: number, // uint16
 lastRiskScoreBps: number, // uint16
 lastReportHash: `0x${string}`, // bytes32
 state: number]       // uint8 (0=Active, 1=Warned, 2=Slashed, 3=Refunded, 4=Settled)
```

### BondState 枚举

```typescript
enum BondState {
  Active = 0,
  Warned = 1,
  Slashed = 2,
  Refunded = 3,
  Settled = 4,
}
```

## 3. 需要创建/修改的文件

| 操作 | 文件 | 说明 |
|---|---|---|
| 创建 | `apps/web/components/my-bond-card.tsx` | MyBondCard 展示组件 |
| 创建 | `apps/web/hooks/use-user-bond.ts` | 读取用户对指定 leader 的 bond |
| 修改 | `apps/web/app/leaders/[id]/page.tsx` | 集成 MyBondCard |

## 4. hooks/use-user-bond.ts 设计

```typescript
'use client'

import { useReadContract, useReadContracts } from 'wagmi'
import { useAppKitAccount } from '@reown/appkit/react'
import { BOND_VAULT_ABI, BOND_VAULT_ADDRESS, stringToBytes32 } from '@/lib/contracts'

interface BondData {
  id: bigint
  follower: `0x${string}`
  leaderId: `0x${string}`
  amount: bigint
  createdAt: bigint
  expiry: bigint
  riskThresholdBps: number
  lastRiskScoreBps: number
  lastReportHash: `0x${string}`
  state: number
}

// 读取当前钱包对指定 leader 的 bond
export function useUserBond(leaderId: string) {
  const { address, isConnected } = useAppKitAccount()

  // Step 1: 读取 nextBondId
  const { data: nextBondId } = useReadContract({
    address: BOND_VAULT_ADDRESS,
    abi: BOND_VAULT_ABI,
    functionName: 'nextBondId',
    chainId: 5042002,
    query: {
      enabled: isConnected && !!address,
    },
  })

  // Step 2: 批量读取所有 bond
  const bondCount = nextBondId ? Number(nextBondId) - 1 : 0
  const contracts = Array.from({ length: bondCount }, (_, i) => ({
    address: BOND_VAULT_ADDRESS,
    abi: BOND_VAULT_ABI,
    functionName: 'bonds' as const,
    args: [BigInt(i + 1)] as [bigint],
    chainId: 5042002,
  }))

  const { data: bondResults, isLoading } = useReadContracts({
    contracts,
    query: {
      enabled: bondCount > 0 && isConnected && !!address,
    },
  })

  // Step 3: 过滤出当前用户 + 当前 leader 的 bond
  const targetLeaderId = stringToBytes32(leaderId)
  const userBond = bondResults?.find((result) => {
    if (result.status !== 'success' || !result.result) return false
    const bond = result.result as unknown as BondData
    return (
      bond.follower.toLowerCase() === address?.toLowerCase() &&
      bond.leaderId === targetLeaderId
    )
  })

  return {
    bond: userBond ? (userBond.result as unknown as BondData) : null,
    isLoading: isConnected ? isLoading : false,
    isConnected: !!isConnected && !!address,
  }
}
```

**关键设计决策**：
- 使用 `useReadContracts`（multicall）一次性读取所有 bond，不是在循环中调用 `useReadContract`
- `enabled` 条件确保未连接钱包或无 bond 时不发起请求
- 比较地址时用 `.toLowerCase()` 避免大小写不匹配
- 比较_leaderId_时用_bytes32_精确匹配



## 4.1 额外修正：tuple normalize、最新 bond、刷新策略

### 重要：`bonds(uint256)` 返回 tuple，不是对象

Solidity public mapping getter `bonds(uint256)` 在 wagmi/viem 中通常返回 tuple/readonly array。不要假设 `result.result` 直接具有 `bond.follower`、`bond.leaderId` 等对象字段。

必须先定义 tuple 类型，并通过 `normalizeBond(tuple)` 转成对象：

```typescript
type BondTuple = readonly [
  bigint,          // id
  `0x${string}`,   // follower
  `0x${string}`,   // leaderId
  bigint,          // amount
  bigint,          // createdAt
  bigint,          // expiry
  number,          // riskThresholdBps
  number,          // lastRiskScoreBps
  `0x${string}`,   // lastReportHash
  number           // state
]

interface BondData {
  id: bigint
  follower: `0x${string}`
  leaderId: `0x${string}`
  amount: bigint
  createdAt: bigint
  expiry: bigint
  riskThresholdBps: number
  lastRiskScoreBps: number
  lastReportHash: `0x${string}`
  state: number
}

function normalizeBond(tuple: BondTuple): BondData {
  return {
    id: tuple[0],
    follower: tuple[1],
    leaderId: tuple[2],
    amount: tuple[3],
    createdAt: tuple[4],
    expiry: tuple[5],
    riskThresholdBps: tuple[6],
    lastRiskScoreBps: tuple[7],
    lastReportHash: tuple[8],
    state: tuple[9],
  }
}
```

### 多个 bond 的选择规则

如果当前钱包对同一个 leader 有多个 bond，优先展示 **id 最大的 bond**，也就是最新创建的 bond。

推荐实现：

```typescript
const matchedBonds = bondResults
  ?.filter((result) => result.status === 'success' && result.result)
  .map((result) => normalizeBond(result.result as BondTuple))
  .filter((bond) =>
    bond.follower.toLowerCase() === address?.toLowerCase() &&
    bond.leaderId.toLowerCase() === targetLeaderId.toLowerCase()
  )
  .sort((a, b) => Number(b.id - a.id))

const bond = matchedBonds?.[0] ?? null
```

### 扫描上限

MVP 阶段最多扫描最近 100 个 bond，避免前端一次性发起过多读取。

读取范围建议：

```typescript
const latestBondId = nextBondId ? Number(nextBondId) - 1 : 0
const startBondId = Math.max(1, latestBondId - 99)
const bondIds = latestBondId >= 1
  ? Array.from({ length: latestBondId - startBondId + 1 }, (_, i) => startBondId + i)
  : []
```

### 刷新策略

为了让 createBond 后的 MyBondCard 自动出现，`useUserBond` 应支持自动刷新或手动刷新。

推荐：

- `nextBondId()` query 设置 `refetchInterval: isConnected ? 5000 : false`
- `useReadContracts()` query 设置 `refetchInterval: isConnected && bondCount > 0 ? 5000 : false`
- hook 返回 `refetch`，用于未来手动刷新按钮

### 安全失败

不允许因为链上读取失败导致页面崩溃。读取失败时返回：

```typescript
{
  bond: null,
  isLoading: false,
  isConnected,
  error: 'Unable to load bond status'
}
```

页面上显示友好 fallback：`Unable to load bond status`。


## 5. components/my-bond-card.tsx 设计

展示内容：

| 字段 | 格式 |
|---|---|
| Bond ID | `bond.id.toString()` |
| Status | Badge 颜色：Active=green, Warned=yellow, Slashed=red, Refunded=blue, Settled=gray |
| Amount | `formatUnits(bond.amount, 18)` USDC |
| Risk Threshold | `${bond.riskThresholdBps} bps` |
| Last Risk Score | `${bond.lastRiskScoreBps} bps`（0 时显示 "Pending"） |
| Created At | `new Date(Number(bond.createdAt) * 1000).toLocaleDateString()` |
| Expiry | `new Date(Number(bond.expiry) * 1000).toLocaleDateString()` |

不实现 refund/slash/settle 交互按钮，只显示状态。

## 6. app/leaders/[id]/page.tsx 集成

在现有 BondCreateModal **上方**添加 MyBondCard 区域：

```
[Leader Profile]           [Risk Card]
                           [MyBondCard / No Bond / Connect Wallet]
                           [BondCreateModal]
                           [Report Placeholder]
```

逻辑：
1. 钱包未连接 → 显示 "Connect wallet to view your bonds"
2. 钱包已连接，loading → 显示 loading skeleton
3. 钱包已连接，无 bond → 显示 "No protection bond yet for this leader"
4. 钱包已连接，有 bond → 显示 MyBondCard

## 7. 已有文件参考（不要修改这些文件的内容，只参考其模式）

### apps/web/lib/contracts.ts（已有）

- `BOND_VAULT_ADDRESS` - 已有
- `BOND_VAULT_ABI` - 已有 createBond / bonds / nextBondId
- `stringToBytes32()` - 已有

**不需要修改 contracts.ts**，现有 ABI 已包含 `bonds` 和 `nextBondId`。

### apps/web/lib/arc.ts（已有）

- `arcTestnet` chain config
- `txUrl()` helper

### apps/web/components/bond-create-modal.tsx（已有，不修改）

参考其模式：
- `useAppKitAccount()` 获取 address, isConnected
- `useWriteContract` / `useWaitForTransactionReceipt` 模式
- 未连接时显示友好提示

## 8. Codex 执行 Prompt

> 将以下内容完整粘贴给 Codex 执行。

---

你正在为 CopyGuard Bond 项目添加 MyBondCard 功能——在 leader detail 页面展示当前钱包对当前 leader 的 bond 状态。前端代码在 `apps/web/`。

### 当前状态

- Next.js 15 前端已搭建完成（Task 8A）
- Reown AppKit + wagmi + viem 已集成
- `apps/web/lib/contracts.ts` 已有 BOND_VAULT_ABI（包含 createBond, bonds, nextBondId）
- `apps/web/lib/arc.ts` 已有 arcTestnet chain config + txUrl helper
- `apps/web/components/bond-create-modal.tsx` 已有 createBond 功能
- `apps/web/app/leaders/[id]/page.tsx` 已有 leader detail + risk card + bond create modal

### 已部署合约（Arc Testnet chainId 5042002）

```
CopyGuardBondVault: 0x822bBEF75F14744d11BaC553997Bd908dBE49B47
```

### 合约 Bond 读取方式

CopyGuardBondVault 没有 `(follower, leaderId) → bondId` 的反向映射。

读取策略：
1. 调用 `nextBondId()` 获取当前 bond 总数
2. 使用 wagmi `useReadContracts`（multicall）批量读取 `bonds(1)` 到 `bonds(nextBondId - 1)`
3. 过滤结果：`follower == userAddress` AND `leaderId == expectedLeaderId`

**重要**：
- 使用 `useReadContracts`（单次 multicall）
- **不要**在循环中调用 `useReadContract`
- MVP 阶段 bond 数量少（测试网），批量读取完全可行
- `nextBondId` 从 1 开始，所以有效 bond ID 是 1 到 nextBondId-1

### Bond struct 返回值（按合约顺序）

```typescript
// bonds(bondId) 返回元组：
[id: bigint, follower: `0x${string}`, leaderId: `0x${string}`,
 amount: bigint, createdAt: bigint, expiry: bigint,
 riskThresholdBps: number, lastRiskScoreBps: number,
 lastReportHash: `0x${string}`, state: number]
```

### BondState 枚举

```
0 = Active, 1 = Warned, 2 = Slashed, 3 = Refunded, 4 = Settled
```

### 步骤

#### Step 1: 创建 hooks/use-user-bond.ts

创建 `apps/web/hooks/use-user-bond.ts`：

- export function `useUserBond(leaderId: string)`
- 使用 `useAppKitAccount()` 获取 address, isConnected
- 使用 `useReadContract` 读取 `nextBondId()`
- 基于 nextBondId 构建 contracts 数组（bondId 1 到 nextBondId-1）
- 使用 `useReadContracts` 批量读取所有 bond
- 使用 `stringToBytes32(leaderId)` 计算目标 leaderId
- 过滤结果：follower.toLowerCase() === address.toLowerCase() AND leaderId === targetLeaderId
- 返回 `{ bond: BondData | null, isLoading: boolean, isConnected: boolean }`
- `enabled` 条件：isConnected && !!address && bondCount > 0

#### Step 2: 创建 components/my-bond-card.tsx

创建 `apps/web/components/my-bond-card.tsx`：

- 接收 BondData prop
- 展示以下信息：
  - Bond ID
  - Status badge（Active=green, Warned=yellow, Slashed=red, Refunded=blue, Settled=gray）
  - Amount（formatUnits(bond.amount, 18) USDC）
  - Risk Threshold（`${bond.riskThresholdBps} bps`）
  - Last Risk Score（`${bond.lastRiskScoreBps} bps`，0 时显示 "Pending"）
  - Created At（Date 格式化）
  - Expiry（Date 格式化）
- 不实现 refund/slash/settle 按钮
- 使用 shadcn/ui Badge + Card 组件
- `'use client'` directive

#### Step 3: 修改 app/leaders/[id]/page.tsx

在 BondCreateModal **上方**添加 MyBondCard 区域：

```
[Leader Profile]           [Risk Card]
                           [MyBondCard Section]
                           [BondCreateModal]
                           [Report Placeholder]
```

逻辑：
1. import `useUserBond` 和 `MyBondCard`
2. 调用 `useUserBond(leaderId)` 获取 bond 数据
3. 在 RiskCard 和 BondCreateModal 之间添加新 section：
   - 未连接钱包："Connect wallet to view your bonds"（友好提示）
   - 已连接 + loading：loading skeleton
   - 已连接 + 无 bond："No protection bond yet for this leader"
   - 已连接 + 有 bond：渲染 `<MyBondCard bond={bond} />`

### 强约束

- **不修改** `contracts/` 下的任何文件
- **不修改** `agents/` 下的任何文件
- **不修改** `apps/web/next.config.js`
- **不修改** `apps/web/lib/contracts.ts`（已有 bonds 和 nextBondId ABI）
- **不修改** `apps/web/components/bond-create-modal.tsx`
- **不在循环中** 调用 useReadContract，使用 useReadContracts（multicall）
- **不实现** refund/slash/settle 交互按钮
- **不实现** ReportPaywall 或 x402 unlock
- **不实现** /events 真实 getLogs
- **不进入** Task 10C 或其他 Task
- 地址比较用 `.toLowerCase()` 避免大小写问题
- npm run build **必须通过**



### 额外强约束

- `bonds(uint256)` 返回值必须按 tuple 处理，不要假设返回对象。
- 必须定义 `BondTuple`，并通过 `normalizeBond(tuple)` 转成 `BondData` 对象。
- 如果同一个钱包对同一个 leader 有多个 bond，优先展示 `id` 最大的最新 bond。
- `leaderId` 比较必须统一大小写：`bond.leaderId.toLowerCase() === stringToBytes32(leaderId).toLowerCase()`。
- `address` 比较必须统一大小写：`bond.follower.toLowerCase() === address.toLowerCase()`。
- MVP 阶段最多扫描最近 100 个 bond。
- `useUserBond` 应设置自动刷新或返回 `refetch`，推荐 5 秒刷新一次，方便 createBond 后自动显示最新 bond。
- 链上读取失败不能导致页面崩溃，应展示 `Unable to load bond status`。
- MyBondCard 建议额外展示 follower address、leaderId、lastReportHash。

### 验证

```bash
cd apps/web && npm run build
```

必须通过，无类型错误。

---

## 9. Task 10B 验收 Checklist

| # | 检查项 | 验证方式 |
|---|---|---|
| 1 | `npm run build` 通过 | `cd apps/web && npm run build` |
| 2 | `hooks/use-user-bond.ts` 存在，使用 useReadContracts（非循环 useReadContract） | 读文件 |
| 3 | `components/my-bond-card.tsx` 存在，展示 bond 字段 | 读文件 |
| 4 | `/leaders/[id]` 页面集成 MyBondCard section | 读文件 |
| 5 | 钱包未连接时显示 "Connect wallet to view your bonds" | 读文件 / 运行时验证 |
| 6 | 钱包已连接但无 bond 时显示 "No protection bond yet" | 运行时验证 |
| 7 | 钱包已连接且有 bond 时展示 MyBondCard | 运行时验证 |
| 8 | 能读取刚刚 createBond 产生的 bond（txHash 0x2eb069...） | 运行时验证 |
| 9 | MyBondCard 展示：bondId, status, amount, riskThreshold, riskScore, expiry | 读文件 |
| 10 | Status badge 颜色正确（Active=green, Warned=yellow 等） | 读文件 |
| 11 | 不实现 refund/slash/settle 交互按钮 | 读文件 |
| 12 | `contracts/` git diff 为空 | `git diff contracts/` |
| 13 | `agents/` git diff 为空 | `git diff agents/` |
| 14 | `next.config.js` git diff 为空 | `git diff apps/web/next.config.js` |
| 15 | 不修改 `contracts.ts` / `bond-create-modal.tsx` | `git diff` 检查 |
| 16 | `bonds()` 返回值按 tuple normalize 处理 | 读 `use-user-bond.ts` |
| 17 | 多个 bond 时展示 id 最大的最新 bond | 读文件 / 运行时验证 |
| 18 | 最多扫描最近 100 个 bond | 读 `use-user-bond.ts` |
| 19 | 读取失败时页面不崩溃，有友好错误提示 | 运行时验证 |
| 20 | MyBondCard 展示 follower、leaderId、lastReportHash 或等价信息 | 读文件 / 运行时验证 |
