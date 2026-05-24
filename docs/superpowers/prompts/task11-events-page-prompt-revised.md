# Task 11: Events Page — 链上事件流 — Codex 执行 Prompt（修正版）

> **范围**：实现 `/events` 页面，用 viem 从 Arc Testnet 合约读取真实链上事件，展示事件流。替换当前 placeholder。
>
> **本修正版关键修正**：不要使用 `"latest" - 10000n` 这种非法写法；必须先 `getBlockNumber()`，再计算 `fromBlock`。默认 lookback 使用 `120000n`，避免读不到此前已创建的 `BondCreated` 事件。

## 1. 目标

1. 用 viem `publicClient.getContractEvents()` 或兼容的 `publicClient.getLogs()` 从 Arc Testnet 读取 CopyGuardBondVault + ReportPayment + RiskOracleAdapter 的链上事件
2. 解码事件参数，按 block number 降序排列
3. 在 `/events` 页面展示事件流
4. 支持简单 event type filter（tab 切换）
5. 空状态、loading、配置缺失友好提示
6. 不修改链上状态，纯 read-only

## 2. 合约事件定义

### CopyGuardBondVault (0x822bBEF75F14744d11BaC553997Bd908dBE49B47)

```solidity
event BondCreated(uint256 indexed bondId, address indexed follower, bytes32 indexed leaderId, uint256 amount);
event RiskUpdated(uint256 indexed bondId, uint16 riskScoreBps, bytes32 reportHash);
event BondWarned(uint256 indexed bondId, uint16 riskScoreBps);
event BondSlashed(uint256 indexed bondId, uint256 slashedAmount);
event BondRefunded(uint256 indexed bondId, uint256 amount);
event BondSettled(uint256 indexed bondId);
```

### ReportPayment (0x15832FA84424E257ACf3735e905E9a5d3B33ee82)

```solidity
event ReportPurchased(address indexed user, bytes32 indexed leaderId, uint256 amount, uint256 timestamp);
```

### RiskOracleAdapter (0x63109ECE16d78A5cEc5499F7f154e107549f7965)

```solidity
event RiskUpdateForwarded(uint256 indexed bondId, uint16 riskScoreBps, bytes32 reportHash, address indexed oracle);
```

## 3. 需要创建/修改的文件

| 操作 | 文件 | 说明 |
|---|---|---|
| 创建 | `apps/web/hooks/use-events.ts` | viem getLogs + TanStack Query 轮询 |
| 创建 | `apps/web/components/event-feed.tsx` | 事件流列表组件 |
| 修改 | `apps/web/lib/contracts.ts` | 添加 event ABI 定义 |
| 修改 | `apps/web/app/events/page.tsx` | 替换 placeholder 为真实事件页面 |

## 4. 需要添加到 contracts.ts 的内容

当前 `apps/web/lib/contracts.ts` 已有 `BOND_VAULT_ABI`（函数）和 `REPORT_PAYMENT_ABI`（函数），但没有 event 定义。

**需要添加 event ABI 片段**（追加到现有文件末尾，不修改已有内容）：

```typescript
// --- Event definitions for getLogs ---

export const BOND_VAULT_EVENTS = [
  {
    type: "event",
    name: "BondCreated",
    inputs: [
      { name: "bondId", type: "uint256", indexed: true },
      { name: "follower", type: "address", indexed: true },
      { name: "leaderId", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RiskUpdated",
    inputs: [
      { name: "bondId", type: "uint256", indexed: true },
      { name: "riskScoreBps", type: "uint16", indexed: false },
      { name: "reportHash", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BondWarned",
    inputs: [
      { name: "bondId", type: "uint256", indexed: true },
      { name: "riskScoreBps", type: "uint16", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BondSlashed",
    inputs: [
      { name: "bondId", type: "uint256", indexed: true },
      { name: "slashedAmount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BondRefunded",
    inputs: [
      { name: "bondId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BondSettled",
    inputs: [
      { name: "bondId", type: "uint256", indexed: true },
    ],
  },
] as const

export const REPORT_PAYMENT_EVENTS = [
  {
    type: "event",
    name: "ReportPurchased",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "leaderId", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const

export const RISK_ORACLE_EVENTS = [
  {
    type: "event",
    name: "RiskUpdateForwarded",
    inputs: [
      { name: "bondId", type: "uint256", indexed: true },
      { name: "riskScoreBps", type: "uint16", indexed: false },
      { name: "reportHash", type: "bytes32", indexed: false },
      { name: "oracle", type: "address", indexed: true },
    ],
  },
] as const
```

**不修改**文件中已有的任何内容（BOND_VAULT_ABI、REPORT_PAYMENT_ABI、stringToBytes32 等）。

## 5. hooks/use-events.ts 设计

### viem public client 创建

使用 wagmi config 中已有的 transport 创建 public client：

```typescript
import { createPublicClient, parseAbiItem } from "viem"
import { arcTestnet } from "@/lib/arc"
```

或者更好的方式：使用 wagmi 的 `usePublicClient` hook 获取已配置的 client。

### getLogs / getContractEvents 策略（必须按本节实现）

由于需要从多个合约读取事件，分别读取再合并。**禁止**写 `fromBlock: "latest" - 10000n`，这是非法写法。

必须先读取最新区块，再计算 fromBlock：

```typescript
const latestBlock = await publicClient.getBlockNumber()
const lookbackBlocks = 120000n
const fromBlock = latestBlock > lookbackBlocks ? latestBlock - lookbackBlocks : 0n
const toBlock = latestBlock
```

优先使用 `getContractEvents`，类型更稳：

```typescript
const bondLogs = BOND_VAULT_ADDRESS
  ? await publicClient.getContractEvents({
      address: BOND_VAULT_ADDRESS,
      abi: BOND_VAULT_EVENTS,
      fromBlock,
      toBlock,
    })
  : []

const reportLogs = REPORT_PAYMENT_ADDRESS
  ? await publicClient.getContractEvents({
      address: REPORT_PAYMENT_ADDRESS,
      abi: REPORT_PAYMENT_EVENTS,
      fromBlock,
      toBlock,
    })
  : []

const oracleLogs = RISK_ORACLE_ADAPTER_ADDRESS
  ? await publicClient.getContractEvents({
      address: RISK_ORACLE_ADAPTER_ADDRESS,
      abi: RISK_ORACLE_EVENTS,
      fromBlock,
      toBlock,
    })
  : []

const allLogs = [...bondLogs, ...reportLogs, ...oracleLogs]
  .filter((log) => log.blockNumber && log.transactionHash)
  .sort((a, b) => {
    if (a.blockNumber === b.blockNumber) return 0
    return a.blockNumber > b.blockNumber ? -1 : 1
  })
```

如果当前 viem 版本不支持一次读取多个 event ABI，可以按单个 event 分别读取后合并。无论使用 `getContractEvents` 还是 `getLogs`，必须保证 TypeScript 类型兼容、`npm run build` 通过。

如果 Arc RPC 因 block range 太大报错，可以 fallback 到 `10000n`，但 UI 需要显示：

```text
Showing recent events only. Increase event lookback if older events are missing.
```

### Hook 返回类型

```typescript
interface DecodedEvent {
  type: string              // "BondCreated" | "RiskUpdated" | ...
  contractLabel: string     // "BondVault" | "ReportPayment" | "OracleAdapter"
  blockNumber: bigint
  transactionHash: `0x${string}`
  args: Record<string, unknown>
  category: "bonds" | "risk" | "reports"
}
```

### 刷新策略

- TanStack Query `refetchInterval: 10000`（10 秒轮询）
- 不使用 websocket

### 地址缺失处理

如果 `BOND_VAULT_ADDRESS` / `REPORT_PAYMENT_ADDRESS` / `RISK_ORACLE_ADAPTER_ADDRESS` 为空字符串，跳过对应合约的 getLogs，不报错。

## 6. components/event-feed.tsx 设计

### Filter tabs

| Tab | 包含事件 |
|---|---|
| All | 所有事件 |
| Bonds | BondCreated, BondSlashed, BondRefunded, BondSettled |
| Risk | RiskUpdated, BondWarned, RiskUpdateForwarded |
| Reports | ReportPurchased |

### 事件行展示

每条事件展示：

| 字段 | 格式 |
|---|---|
| 事件类型 badge | 颜色编码（BondCreated=green, RiskUpdated=blue, BondWarned=yellow, BondSlashed=red, ReportPurchased=purple 等） |
| 合约来源 | "BondVault" / "ReportPayment" / "OracleAdapter" 小标签 |
| Block number | 数字 |
| Tx hash | 截断 + Arcscan 链接 |
| 参数摘要 | 关键参数的人类可读格式，如 "Bond #1 by 0x1234... for 1 USDC" |

### 空状态

- 无事件时显示 "No on-chain events found yet. Events will appear as bonds are created and risk checks are performed."
- Loading 时显示 skeleton 行
- RPC 失败时显示 "Unable to load events from Arc Testnet" + 重试按钮

## 7. app/events/page.tsx 修改

替换整个 placeholder 页面：

```tsx
"use client"

import { EventFeed } from "@/components/event-feed"

export default function EventsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Events</p>
        <h1 className="mt-2 text-4xl font-bold">On-chain Event Stream</h1>
        <p className="mt-2 text-muted-foreground">
          Real-time events from CopyGuard Bond contracts on Arc Testnet.
        </p>
      </div>
      <EventFeed />
    </main>
  )
}
```

## 8. Codex 执行 Prompt

> 将以下内容完整粘贴给 Codex 执行。

---

你正在为 CopyGuard Bond 项目实现 /events 页面——展示 Arc Testnet 上的链上事件流。前端代码在 `apps/web/`。

### 当前状态

- Next.js 15 前端已搭建完成（Task 8A）
- MyBondCard 已实现（Task 10B）
- ReportPaywall 已实现（Task 10C）
- `apps/web/app/events/page.tsx` 当前是 placeholder，需要替换
- `apps/web/lib/contracts.ts` 已有函数 ABI，但没有 event ABI
- wagmi + viem 已集成，transport 已配置

### 已部署合约（Arc Testnet chainId 5042002）

```
CopyGuardBondVault: 0x822bBEF75F14744d11BaC553997Bd908dBE49B47
ReportPayment: 0x15832FA84424E257ACf3735e905E9a5d3B33ee82
RiskOracleAdapter: 0x63109ECE16d78A5cEc5499F7f154e107549f7965
```

### 合约事件签名

**CopyGuardBondVault**：
```solidity
event BondCreated(uint256 indexed bondId, address indexed follower, bytes32 indexed leaderId, uint256 amount)
event RiskUpdated(uint256 indexed bondId, uint16 riskScoreBps, bytes32 reportHash)
event BondWarned(uint256 indexed bondId, uint16 riskScoreBps)
event BondSlashed(uint256 indexed bondId, uint256 slashedAmount)
event BondRefunded(uint256 indexed bondId, uint256 amount)
event BondSettled(uint256 indexed bondId)
```

**ReportPayment**：
```solidity
event ReportPurchased(address indexed user, bytes32 indexed leaderId, uint256 amount, uint256 timestamp)
```

**RiskOracleAdapter**：
```solidity
event RiskUpdateForwarded(uint256 indexed bondId, uint16 riskScoreBps, bytes32 reportHash, address indexed oracle)
```

### 步骤

#### Step 1: 修改 apps/web/lib/contracts.ts

在文件末尾追加 event ABI 定义。**不修改已有内容**。

追加以下导出：
- `BOND_VAULT_EVENTS` — BondCreated, RiskUpdated, BondWarned, BondSlashed, BondRefunded, BondSettled
- `REPORT_PAYMENT_EVENTS` — ReportPurchased
- `RISK_ORACLE_EVENTS` — RiskUpdateForwarded

每个 event 使用 `{ type: "event", name: "...", inputs: [...] }` 格式，包含 `indexed: true/false` 标记。

已有 `RISK_ORACLE_ADAPTER_ADDRESS` 变量（确认存在）。

#### Step 2: 创建 apps/web/hooks/use-events.ts

创建 hook 读取链上事件：

- 使用 wagmi 的 `usePublicClient`，或使用已配置 Arc transport 的 viem `createPublicClient` 获取 public client
- 使用 TanStack Query 的 `useQuery` 封装
- 必须先 `await publicClient.getBlockNumber()`，再计算 `fromBlock` / `toBlock`
- 默认 `lookbackBlocks = 120000n`，避免读不到已发生的 BondCreated / ReportPurchased
- 优先对每个合约分别调用 `publicClient.getContractEvents({ address, abi, fromBlock, toBlock })`
- 如果 viem 类型不兼容，可以按单个 event 分别 getLogs / getContractEvents 后合并
- 合并所有 logs，过滤缺少 `blockNumber` 或 `transactionHash` 的 log，按 blockNumber 降序排序
- 解码事件参数，normalize 为 `Record<string, unknown>`
- 返回 `{ events: DecodedEvent[], isLoading, isError, refetch }`
- `refetchInterval: 10000`（10 秒轮询）
- 地址为空字符串时跳过对应合约的 getLogs
- RPC 失败时不崩溃，返回 isError=true

DecodedEvent 类型：
```typescript
interface DecodedEvent {
  type: string              // 事件名
  contractLabel: string     // "BondVault" | "ReportPayment" | "OracleAdapter"
  blockNumber: bigint
  transactionHash: `0x${string}`
  args: Record<string, unknown>
  category: "bonds" | "risk" | "reports"
}
```

category 映射：
- "bonds": BondCreated, BondSlashed, BondRefunded, BondSettled
- "risk": RiskUpdated, BondWarned, RiskUpdateForwarded
- "reports": ReportPurchased

#### Step 3: 创建 apps/web/components/event-feed.tsx

事件流组件：

**Filter tabs**：All | Bonds | Risk | Reports（简单 tab 切换）

**事件行**：
- 事件类型 badge（颜色编码：BondCreated=green, RiskUpdated=blue, BondWarned=yellow, BondSlashed=red, ReportPurchased=purple）
- 合约来源小标签
- Block number
- Tx hash 截断 + Arcscan 链接（`https://testnet.arcscan.app/tx/${hash}`）
- 参数摘要（人类可读）

**参数摘要格式示例**：
- BondCreated: "Bond #1 by 0x1234...5678 for 1 USDC"（amount 用 formatUnits(amount, 18)）
- RiskUpdated: "Bond #1 risk score 7267 bps"
- ReportPurchased: "0x1234...5678 purchased report for 1 USDC"
- BondWarned: "Bond #1 warned at 8000 bps"
- 其他类似

**状态**：
- Loading: skeleton 行（3-5 行）
- 空: "No on-chain events found yet. Events will appear as bonds are created and risk checks are performed."
- 错误: "Unable to load events from Arc Testnet" + 重试按钮
- 使用 `'use client'` directive

#### Step 4: 重写 apps/web/app/events/page.tsx

替换整个 placeholder 页面为真实事件页面：

- 页面标题 + 描述
- `<EventFeed />` 组件
- 可以保留 Back Home 链接

### 强约束

- **不修改** `contracts/` 下的任何文件
- **不修改** `agents/` 下的任何文件
- **不修改** `apps/web/next.config.js`
- **不修改** `apps/web/components/bond-create-modal.tsx`
- **不修改** `apps/web/components/my-bond-card.tsx`
- **不修改** `apps/web/components/report-paywall.tsx`
- **不修改** `apps/web/app/leaders/` 下的任何文件
- **只追加**到 `apps/web/lib/contracts.ts`（不修改已有内容）
- **不修改链上状态**，只读取事件
- **不做** refund/slash/settle 交互
- **不做** websocket，用 polling
- **不做** 复杂筛选，最多 tab filter
- npm run build **必须通过**


### 额外强约束：事件读取必须真实可验收

- 默认 lookback 必须是 `120000n`，不是 `10000n`。
- `/events` 运行时应尽量读取到已有链上事件，至少包括：
  - `BondCreated`（此前已创建 Bond #1）
  - `ReportPurchased`（此前已购买 hl_leader_03 report）
- 如果读取不到 `BondCreated`，不要静默通过；需要在代码或 UI 中明确说明当前只显示最近事件，或扩大 lookback。
- 排序必须使用 bigint 安全比较：

  ```typescript
  .sort((a, b) => {
    if (a.blockNumber === b.blockNumber) return 0
    return a.blockNumber > b.blockNumber ? -1 : 1
  })
  ```

- 失败处理必须区分：
  - 地址缺失：跳过对应合约，不报错
  - RPC 报错：页面显示错误和 Retry
  - range 太大：fallback 到较小范围，并显示 recent-only 提示

### 验证

```bash
cd apps/web && npm run build
```

必须通过，无类型错误。

---

## 9. Task 11 验收 Checklist

| # | 检查项 | 验证方式 |
|---|---|---|
| 1 | `npm run build` 通过 | `cd apps/web && npm run build` |
| 2 | `hooks/use-events.ts` 存在，使用 viem getContractEvents 或兼容 getLogs | 读文件 |
| 3 | `components/event-feed.tsx` 存在，展示事件流 | 读文件 |
| 4 | `/events` 页面替换了 placeholder | 读文件 |
| 5 | contracts.ts 追加了 event ABI（不修改已有内容） | 读文件 + `git diff` |
| 6 | 能读取 BondCreated 事件 | 运行时验证（已确认有 Bond #1；默认 120000 block lookback 应覆盖） |
| 7 | 能读取 ReportPurchased 事件 | 运行时验证 |
| 8 | 事件按 block number 降序排列，且使用 bigint 安全比较 | 读代码 |
| 9 | 支持 tab filter（All / Bonds / Risk / Reports） | 读代码 |
| 10 | 事件行展示：类型 badge + block + txHash + 参数摘要 | 读代码 |
| 11 | txHash 有 Arcscan 链接 | 读代码 |
| 12 | 空状态友好提示 | 读代码 |
| 13 | Loading 状态 skeleton | 读代码 |
| 14 | RPC 错误不崩溃，有重试 | 读代码 |
| 15 | 10 秒轮询刷新 | 读代码 |
| 15A | fromBlock 通过 getBlockNumber 动态计算，默认 lookbackBlocks=120000n | 读代码 |
| 15B | 禁止出现 `"latest" - 10000n` 或类似字符串减法 | 全局搜索 |
| 15C | RPC range 过大时有 fallback 或 recent-only 友好提示 | 读代码 |
| 16 | 地址缺失时不报错 | 读代码 |
| 17 | 不修改 contracts/ | `git diff contracts/` |
| 18 | 不修改 agents/ | `git diff agents/` |
| 19 | 不修改 next.config.js | `git diff apps/web/next.config.js` |
| 20 | 不修改 bond-create-modal / my-bond-card / report-paywall | `git diff` |
| 21 | 不修改 leaders/ 页面 | `git diff apps/web/app/leaders/` |
