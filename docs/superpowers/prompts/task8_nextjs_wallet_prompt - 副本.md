# Task 8: Next.js + Reown AppKit + Arc Testnet Wallet + Full Frontend — 完整执行上下文

> 注意：本 Task 合并了原 execution plan 中的 Task 8（前端 scaffold + 钱包连接）、Task 9（首页）、Task 10A（Leaders 列表+详情）、Task 10B（Bond 创建+展示）。这样可以在一个 Codex 执行周期内完成前端主体。

## 1. 目标

搭建完整的 Next.js 15 前端应用，包括：
- Arc Testnet 钱包连接（Reown AppKit + wagmi + viem）
- 首页（Hero + 钱包连接 + 指标卡片）
- Leaders 列表页（5 个 leader + risk score）
- Leader 详情页（risk card + bond 创建 + my bond 状态）
- Events 页面（链上事件流）
- 所有合约交互通过 wagmi hook 调用已部署的 Arc 合约

## 2. 需要创建/修改的文件

| 操作 | 文件 |
|---|---|
| 创建 | `apps/web/lib/arc.ts` |
| 创建 | `apps/web/lib/wagmi.ts` |
| 创建 | `apps/web/lib/contracts.ts` |
| 创建 | `apps/web/lib/api.ts` |
| 创建 | `apps/web/app/providers.tsx` |
| 创建 | `apps/web/components/wallet-connect.tsx` |
| 创建 | `apps/web/components/leader-card.tsx` |
| 创建 | `apps/web/components/risk-card.tsx` |
| 创建 | `apps/web/components/bond-create-modal.tsx` |
| 创建 | `apps/web/components/bond-card.tsx` |
| 创建 | `apps/web/components/event-feed.tsx` |
| 创建 | `apps/web/hooks/use-leaders.ts` |
| 创建 | `apps/web/hooks/use-bonds.ts` |
| 创建 | `apps/web/hooks/use-events.ts` |
| 创建 | `apps/web/app/leaders/page.tsx` |
| 创建 | `apps/web/app/leaders/[id]/page.tsx` |
| 创建 | `apps/web/app/events/page.tsx` |
| 修改 | `apps/web/package.json`（新增依赖） |
| 修改 | `apps/web/app/layout.tsx`（添加 providers） |
| 修改 | `apps/web/app/page.tsx`（首页内容） |
| 修改 | `apps/web/.env.example`（添加新变量） |
| 不修改 | `apps/web/next.config.js`（已有 API rewrite） |
| 不修改 | `contracts/*`、`agents/*` |

## 3. 前端环境变量

`.env.local`（用户本地创建，不提交）：

```
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<用户从 https://cloud.walletconnect.com 获取>
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```

更新 `.env.example`：
```
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
NEXT_PUBLIC_BOND_VAULT_ADDRESS=0x822bBEF75F14744d11BaC553997Bd908dBE49B47
NEXT_PUBLIC_REPORT_PAYMENT_ADDRESS=0x15832FA84424E257ACf3735e905E9a5d3B33ee82
NEXT_PUBLIC_LEADER_REGISTRY_ADDRESS=0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967
NEXT_PUBLIC_RISK_ORACLE_ADAPTER_ADDRESS=0x63109ECE16d78A5cEc5499F7f154e107549f7965
```

## 4. Arc Testnet Chain Config

```typescript
// lib/arc.ts
import { defineChain } from 'viem'

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arcscan',
      url: 'https://testnet.arcscan.app',
    },
  },
})
```

## 5. Reown AppKit / wagmi / viem 集成方案

### 需要安装的依赖

```bash
npm install @reown/appkit @reown/appkit-adapter-wagmi wagmi viem@2.x @tanstack/react-query
```

### wagmi.ts 配置

```typescript
// lib/wagmi.ts
import { http, createConfig } from 'wagmi'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { arcTestnet } from './arc'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

export const wagmiAdapter = new WagmiAdapter({
  networks: [arcTestnet],
  projectId,
  ssr: true,
})

export const config = wagmiAdapter.wagmiConfig
```

### providers.tsx

```typescript
// app/providers.tsx
'use client'

import { WagmiProvider } from 'wagmi'
import { config } from '@/lib/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppKit } from '@reown/appkit/react'

const queryClient = new QueryClient()
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
        <AppKit />
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### wallet-connect.tsx

```typescript
// components/wallet-connect.tsx
'use client'

import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react'
import { useBalance } from 'wagmi'
import { arcTestnet } from '@/lib/arc'

export function WalletConnect() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({
    address: address as `0x${string}`,
    chainId: arcTestnet.id,
  })

  if (!isConnected) {
    return <button onClick={() => open()}>Connect Wallet</button>
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
      {balance && <span className="text-sm">{Number(balance.formatted).toFixed(2)} USDC</span>}
      <button onClick={() => disconnect()}>Disconnect</button>
    </div>
  )
}
```

## 6. CopyGuardBondVault createBond 调用参数

合约签名（从 Foundry 编译输出确认）：
```solidity
function createBond(bytes32 leaderId, uint16 riskThresholdBps, uint256 expiry) external payable
```

### wagmi 调用方式

```typescript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'

const { writeContract, data: txHash } = useWriteContract()
const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

writeContract({
  address: BOND_VAULT_ADDRESS,
  abi: BOND_VAULT_ABI,
  functionName: 'createBond',
  args: [
    leaderIdBytes32,       // bytes32 — string 转 bytes32
    riskThresholdBps,      // uint16 — e.g. 7000
    expiryTimestamp,       // uint256 — Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
  ],
  value: parseEther(amount), // msg.value = bond amount in USDC (18 decimals)
  chainId: arcTestnet.id,
})
```

### leaderId 转 bytes32

合约中 leaderId 是 `bytes32("hl_leader_03")` 格式（右填充零的 ASCII）。

```typescript
function stringToBytes32(str: string): `0x${string}` {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  const padded = new Uint8Array(32)
  padded.set(bytes)
  return `0x${Array.from(padded).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`
}
```

## 7. 如何读取 Leaders 和 Risk Score

通过 API proxy（next.config.js 已配置 `/api/*` → `localhost:8000`）调用 FastAPI 后端：

```typescript
// hooks/use-leaders.ts
import { useQuery } from '@tanstack/react-query'

export function useLeaders() {
  return useQuery({
    queryKey: ['leaders'],
    queryFn: async () => {
      const res = await fetch('/api/leaders')
      if (!res.ok) throw new Error('Failed to fetch leaders')
      return res.json()
    },
  })
}

export function useLeader(id: string) {
  return useQuery({
    queryKey: ['leader', id],
    queryFn: async () => {
      const res = await fetch(`/api/leaders/${id}`)
      if (!res.ok) throw new Error('Failed to fetch leader')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useRisk(id: string) {
  return useQuery({
    queryKey: ['risk', id],
    queryFn: async () => {
      const res = await fetch(`/api/risk/${id}`)
      if (!res.ok) throw new Error('Failed to fetch risk')
      return res.json()
    },
    enabled: !!id,
  })
}
```

### Leader 数据结构（来自 FastAPI）

```json
{
  "id": "hl_leader_03",
  "name": "Reckless Raj",
  "venue": "Hyperliquid",
  "metrics": { "pnl7d": -0.04, "pnl30d": 0.02, ... }
}
```

### Risk Summary 数据结构

```json
{
  "leaderId": "hl_leader_03",
  "riskScoreBps": 7267,
  "action": "EXIT",
  "confidenceBps": 7500,
  "summaryReason": "Drawdown acceleration exceeded safe threshold"
}
```

## 8. 如何展示 Bond 创建结果

### BondCreateModal 流程

1. 用户输入 amount（USDC 数量，如 "1"）
2. riskThresholdBps 默认 7000
3. expiry 默认 30 天
4. 点击创建 → wagmi writeContract 调用 createBond
5. 等待 tx 确认（useWaitForTransactionReceipt）
6. 成功后显示 tx hash（链接到 Arcscan）

### MyBondCard 展示

从合约读取用户 bond 信息：
```typescript
import { useReadContract } from 'wagmi'

// 读取 bond 数据
const { data: bond } = useReadContract({
  address: BOND_VAULT_ADDRESS,
  abi: BOND_VAULT_ABI,
  functionName: 'bonds',
  args: [bondId],
})
```

Bond struct 返回的元组（按合约定义顺序）：
```
[id, follower, leaderId, amount, createdAt, expiry, riskThresholdBps, lastRiskScoreBps, lastReportHash, state]
```

state 枚举值：0=Active, 1=Warned, 2=Slashed, 3=Refunded, 4=Settled

### Bond 状态 badge 颜色

| State | 值 | 颜色 |
|---|---|---|
| Active | 0 | green |
| Warned | 1 | yellow |
| Slashed | 2 | red |
| Refunded | 3 | blue |
| Settled | 4 | gray |

## 9. Codex 执行 Prompt

> 将以下内容完整粘贴给 Codex 执行。

---

你正在为 CopyGuard Bond 项目搭建完整的 Next.js 15 前端。前端代码在 `apps/web/`。

### 当前状态

- Next.js 15 已初始化（App Router + TypeScript + Tailwind + shadcn/ui）
- `apps/web/next.config.js` 已有 API rewrite `/api/*` → `localhost:8000`
- `apps/web/.env.example` 已有 NEXT_PUBLIC_ARC_RPC_URL, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, NEXT_PUBLIC_FASTAPI_URL
- `apps/web/components/ui/` 已有 shadcn/ui 组件
- `apps/web/app/layout.tsx` 是默认 layout
- `apps/web/app/page.tsx` 是默认 Next.js 页面
- **没有安装 web3 依赖**（wagmi, viem, @reown/appkit 等）

### 已部署合约（Arc Testnet chainId 5042002）

```
CopyGuardBondVault: 0x822bBEF75F14744d11BaC553997Bd908dBE49B47
LeaderRegistry: 0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967
RiskOracleAdapter: 0x63109ECE16d78A5cEc5499F7f154e107549f7965
ReportPayment: 0x15832FA84424E257ACf3735e905E9a5d3B33ee82
```

### 合约函数签名（从 Foundry 编译输出）

**CopyGuardBondVault**：
- `createBond(bytes32 leaderId, uint16 riskThresholdBps, uint256 expiry)` — payable
- `bonds(uint256 bondId)` — view, returns (id, follower, leaderId, amount, createdAt, expiry, riskThresholdBps, lastRiskScoreBps, lastReportHash, state)
- `nextBondId()` — view, returns uint256

**ReportPayment**：
- `purchaseReport(bytes32 leaderId)` — payable, msg.value = 1e18
- `hasPurchased(address user, bytes32 leaderId)` — view, returns bool

**LeaderRegistry**：
- `getActiveLeaders()` — view, returns bytes32[]
- `getLeader(bytes32 id)` — view, returns Leader struct

### FastAPI 后端 Endpoints（localhost:8000，通过 next.config.js proxy）

- `GET /api/leaders` — 返回 5 个 leader 列表
- `GET /api/leaders/:id` — 返回 leader 详情 + metricsHistory
- `GET /api/risk/:id` — 返回 {leaderId, riskScoreBps, action, confidenceBps, summaryReason}
- `GET /api/reports/:id` — 返回 402（x402 paywall）
- `POST /api/oracle/run-risk-check` — body: {leaderId, bondId}

### 步骤

#### Step 1: 安装依赖

```bash
cd apps/web
npm install @reown/appkit @reown/appkit-adapter-wagmi wagmi viem@2.x @tanstack/react-query
```

#### Step 2: 创建 lib/arc.ts

Arc Testnet chain 定义：
- id: 5042002
- name: 'Arc Testnet'
- nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }
- rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } }
- blockExplorers: { default: { name: 'Arcscan', url: 'https://testnet.arcscan.app' } }

#### Step 3: 创建 lib/wagmi.ts

Reown AppKit + wagmi 配置：
- 使用 @reown/appkit-adapter-wagmi 的 WagmiAdapter
- networks: [arcTestnet]（只支持 Arc Testnet）
- projectId 从 NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
- SSR: true
- 导出 wagmiAdapter.wagmiConfig 作为 config

#### Step 4: 创建 lib/contracts.ts

导出合约 ABI 和地址：
- 从 `process.env.NEXT_PUBLIC_BOND_VAULT_ADDRESS` 等环境变量读取地址
- ABI 可以硬编码（只需要用到的函数），或从 `../../contracts/out/` 的 JSON 文件中提取
- 导出 `BOND_VAULT_ABI`、`BOND_VAULT_ADDRESS`、`REPORT_PAYMENT_ABI`、`REPORT_PAYMENT_ADDRESS`、`LEADER_REGISTRY_ABI`、`LEADER_REGISTRY_ADDRESS`
- Helper 函数 `stringToBytes32(str: string): \`0x${string}\`` 将字符串转为 bytes32（右填充零）

#### Step 5: 创建 lib/api.ts

TanStack Query hooks：
- `useLeaders()` — fetch `/api/leaders`
- `useLeader(id)` — fetch `/api/leaders/${id}`
- `useRisk(id)` — fetch `/api/risk/${id}`

#### Step 6: 创建 app/providers.tsx

Client component 包裹：
- WagmiProvider (config from wagmi.ts)
- QueryClientProvider
- AppKit from @reown/appkit/react（底部）

#### Step 7: 创建 components/wallet-connect.tsx

使用 @reown/appkit/react hooks：
- `useAppKit` 的 `open()` 打开钱包连接
- `useAppKitAccount` 获取 address, isConnected
- `useDisconnect` 断开连接
- `useBalance` (wagmi) 显示 USDC 余额
- 已连接显示：地址缩写 + USDC 余额 + disconnect 按钮
- 未连接显示：Connect Wallet 按钮

#### Step 8: 创建 hooks/use-leaders.ts, hooks/use-bonds.ts, hooks/use-events.ts

**use-leaders.ts**：
- `useLeaders()` — TanStack Query, fetch `/api/leaders`
- `useLeader(id)` — fetch `/api/leaders/${id}`
- `useRisk(id)` — fetch `/api/risk/${id}`

**use-bonds.ts**：
- `useUserBonds(userAddress)` — 遍历 bondId 1 到 nextBondId，读取每个 bond 的 follower 是否匹配 userAddress。使用 wagmi useReadContract。
- 注意：MVP 阶段可以简单遍历，不需要复杂的索引

**use-events.ts**：
- `useBondEvents()` — 使用 viem `getLogs` 从 CopyGuardBondVault 读取事件
- 事件类型：BondCreated, RiskUpdated, BondWarned, BondSlashed, BondRefunded, BondSettled
- ReportPayment 的 ReportPurchased 事件
- TanStack Query + refetchInterval: 5000

#### Step 9: 创建 components/leader-card.tsx

Leader 列表卡片：
- name, venue
- riskScoreBps 颜色编码：green <3000, yellow 3000-7000, red >7000
- action badge：FOLLOW(green), REDUCE(yellow), EXIT(red)
- confidenceBps
- 链接到 `/leaders/${id}`

#### Step 10: 创建 components/risk-card.tsx

Risk 信息卡片：
- riskScoreBps 进度条（0-10000，颜色渐变）
- action badge
- confidenceBps
- summaryReason

#### Step 11: 创建 components/bond-create-modal.tsx

Modal 对话框：
- amount 输入（USDC 数量，如 "1"）
- riskThresholdBps 输入（默认 7000）
- expiry 预设（默认 30 天）
- 提交按钮 → useWriteContract 调用 createBond
- leaderId 使用 `stringToBytes32(leader.id)` 转换
- expiry 使用 `Math.floor(Date.now() / 1000) + 30 * 86400`
- value 使用 `parseEther(amount)`
- 显示 tx pending / confirmed / failed 状态
- 成功后显示 tx hash（链接到 `testnet.arcscan.app/tx/${txHash}`）
- 未连接钱包时显示 "Connect wallet to create bonds"

#### Step 12: 创建 components/bond-card.tsx

用户 bond 状态卡片：
- state badge（Active=green, Warned=yellow, Slashed=red, Refunded=blue, Settled=gray）
- amount 格式化为 USDC
- riskThresholdBps
- lastRiskScoreBps
- reportHash（截断 + 复制按钮）
- expiry 倒计时

#### Step 13: 创建 components/event-feed.tsx

链上事件列表：
- 事件类型 tab 过滤：All, Bonds, Risk, Reports
- 每条事件：类型图标 + 事件名 + block number + tx hash（Arcscan 链接）+ 参数摘要
- 5 秒自动刷新

#### Step 14: 更新 app/layout.tsx

- metadata: title="CopyGuard Bond", description="Arc-native social trading protection layer"
- 用 Providers 包裹 children
- 保持 Geist font 和 globals.css

#### Step 15: 重写 app/page.tsx（首页）

- Hero section: "CopyGuard Bond" + tagline + 描述
- WalletConnect 组件
- 3 个 metric cards（从 useLeaders 聚合）: Total Leaders, Active Bonds (placeholder 0), Risk Alerts (placeholder 0)
- "View Leaders" CTA 按钮 → /leaders

#### Step 16: 创建 app/leaders/page.tsx

- fetch useLeaders + useRisk for each leader
- grid of LeaderCards
- 每张 card 显示 risk score + action badge
- loading / error 状态

#### Step 17: 创建 app/leaders/[id]/page.tsx

Leader 详情页，4 个区域：
1. **Leader Profile**：name, venue, metrics summary（pnl7d/30d, drawdown, winRate, leverage）
2. **Risk Card**：risk score 进度条 + action + confidence + summaryReason
3. **Bond Section**：
   - 已连接钱包：BondCreateModal 按钮 + MyBondCard（如果用户有 bond）
   - 未连接钱包："Connect wallet to create bonds"
4. **Report Paywall**：显示 "Unlock Full Report — 1 USDC" 按钮（Task 10C 实现完整 x402 flow，Task 8 只显示按钮 placeholder）

#### Step 18: 创建 app/events/page.tsx

- EventFeed 组件
- 自动刷新

#### Step 19: 更新 .env.example

添加合约地址：
```
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
NEXT_PUBLIC_BOND_VAULT_ADDRESS=0x822bBEF75F14744d11BaC553997Bd908dBE49B47
NEXT_PUBLIC_REPORT_PAYMENT_ADDRESS=0x15832FA84424E257ACf3735e905E9a5d3B33ee82
NEXT_PUBLIC_LEADER_REGISTRY_ADDRESS=0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967
NEXT_PUBLIC_RISK_ORACLE_ADAPTER_ADDRESS=0x63109ECE16d78A5cEc5499F7f154e107549f7965
```

#### Step 20: 验证

```bash
cd apps/web && npm run build
```

必须通过，无类型错误。

### 约束

- 不修改 contracts/ 下的任何文件
- 不修改 agents/ 下的任何文件
- 不重新部署合约
- 不提交真实私钥
- 不引入大型 UI 框架（只用 shadcn/ui + Tailwind）
- npm run build 必须通过
- 所有组件使用 'use client' directive（因为依赖 wagmi hooks）
- 保持 next.config.js 不变（已有 API rewrite）
- 不实现 x402 unlock flow（只放 placeholder 按钮，Task 10C 实现）
- risk score 颜色：green <3000, yellow 3000-7000, red >7000

---

## 10. 验收 Checklist

| # | 检查项 | 验证方式 |
|---|---|---|
| 1 | npm run build 通过 | `cd apps/web && npm run build` |
| 2 | wagmi + viem + @reown/appkit + @tanstack/react-query 已安装 | `cat apps/web/package.json` |
| 3 | lib/arc.ts Arc chain config 正确 | 读文件，id=5042002, USDC native |
| 4 | lib/wagmi.ts Reown + wagmi 配置 | 读文件 |
| 5 | lib/contracts.ts 导出 ABI + 地址 | 读文件 |
| 6 | lib/api.ts TanStack Query hooks | 读文件 |
| 7 | app/providers.tsx 包裹 WagmiProvider + QueryClient + AppKit | 读文件 |
| 8 | layout.tsx 使用 Providers | 读文件 |
| 9 | WalletConnect 组件显示地址 + USDC 余额 | 读文件 |
| 10 | app/page.tsx 首页：Hero + WalletConnect + 3 metrics + CTA | 读文件 |
| 11 | app/leaders/page.tsx：5 leader cards + risk scores | 读文件 |
| 12 | app/leaders/[id]/page.tsx：profile + risk card + bond section + report placeholder | 读文件 |
| 13 | BondCreateModal 调用 createBond with msg.value | 读文件 |
| 14 | BondCard 显示 bond state + amount + risk score | 读文件 |
| 15 | app/events/page.tsx：EventFeed + auto refresh | 读文件 |
| 16 | createBond 参数正确：bytes32 leaderId, uint16 threshold, uint256 expiry | 读文件 |
| 17 | leaderId string→bytes32 转换正确（右填充零） | 读文件 |
| 18 | .env.example 包含所有合约地址 | 读文件 |
| 19 | 未修改 contracts/ | `git diff contracts/` 无变更 |
| 20 | 未修改 agents/ | `git diff agents/` 无变更 |
| 21 | 未修改 next.config.js | `git diff apps/web/next.config.js` 无变更 |
