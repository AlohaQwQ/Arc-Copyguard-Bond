# Task 8A: Next.js Frontend + Reown AppKit Wallet + Leader API + createBond 最小闭环

> **收敛说明**：本 Task 是原 Task 8 的收窄版。原 Task 8 合并了 Task 8/9/10A/10B，范围过大。
> Task 8A 只完成前端基础、钱包连接、leaders/risk API 展示、createBond 最小调用路径。
> 完整 MyBond 扫描、真实 event getLogs、x402 unlock、paid report 推迟到后续 Task。

## 1. 目标

搭建 Next.js 15 前端应用的最小可运行骨架：

- Arc Testnet 钱包连接（Reown AppKit + wagmi + viem）
- `/` 首页（基础版：标题 + 钱包连接 + 简单 metrics）
- `/leaders` 页面展示 FastAPI 的 5 个 leaders
- `/leaders/[id]` 页面展示 leader detail + risk score + createBond 入口
- `/events` 页面只做 placeholder/skeleton
- createBond 调用路径完整，成功后展示 txHash + Arcscan 链接

## 2. 需要创建/修改的文件

| 操作 | 文件 | 说明 |
|---|---|---|
| 创建 | `apps/web/lib/arc.ts` | Arc chain 定义 |
| 创建 | `apps/web/lib/wagmi.ts` | Reown + wagmi 配置 |
| 创建 | `apps/web/lib/contracts.ts` | 硬编码最小 ABI + 合约地址 |
| 创建 | `apps/web/lib/api.ts` | TypeScript types + fetcher 函数 |
| 创建 | `apps/web/hooks/use-leaders.ts` | useLeaders / useLeader / useRisk hooks |
| 创建 | `apps/web/app/providers.tsx` | Client component: WagmiProvider + QueryClient + createAppKit |
| 创建 | `apps/web/components/wallet-connect.tsx` | 钱包连接按钮 |
| 创建 | `apps/web/components/leader-card.tsx` | Leader 列表卡片 |
| 创建 | `apps/web/components/risk-card.tsx` | Risk 信息卡片 |
| 创建 | `apps/web/components/bond-create-modal.tsx` | createBond 表单 + 调用 |
| 创建 | `apps/web/app/leaders/page.tsx` | Leaders 列表页 |
| 创建 | `apps/web/app/leaders/[id]/page.tsx` | Leader 详情页 |
| 创建 | `apps/web/app/events/page.tsx` | Events placeholder 页面 |
| 修改 | `apps/web/package.json` | 新增 web3 依赖 |
| 修改 | `apps/web/app/layout.tsx` | 添加 Providers 包裹 |
| 修改 | `apps/web/app/page.tsx` | 基础首页内容 |
| 修改 | `apps/web/.env.example` | 添加合约地址变量 |
| 不修改 | `apps/web/next.config.js` | 已有 API rewrite，保持不变 |
| 不修改 | `contracts/*` | 禁止修改 |
| 不修改 | `agents/*` | 禁止修改 |

## 3. 前端环境变量

`.env.example` 更新：

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

### 强约束：必须按以下方式集成

- 使用 `@reown/appkit` + `@reown/appkit-adapter-wagmi`
- 使用 `WagmiAdapter` 创建 adapter
- 在 client component 中调用 `createAppKit(...)` 初始化
- **不要使用** `<AppKit />` 组件（可能不存在或不稳定）
- 连接按钮使用 `useAppKit().open()` 或 `appkit-modal` web component
- metadata 必须包含 `name`、`description`、`url`、`icons`
- defaultNetwork 设置为 `arcTestnet`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` 缺失时不能导致 build 失败

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
import { createAppKit } from '@reown/appkit/react'
import { arcTestnet } from '@/lib/arc'

const queryClient = new QueryClient()
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

// 只在 projectId 存在时初始化 AppKit
if (typeof window !== 'undefined' && projectId) {
  createAppKit({
    adapters: [],  // WagmiAdapter 通过 wagmi config 管理
    networks: [arcTestnet],
    projectId,
    metadata: {
      name: 'CopyGuard Bond',
      description: 'Arc-native social trading protection layer',
      url: 'http://localhost:3000',
      icons: ['/icon.png'],
    },
    defaultNetwork: arcTestnet,
  })
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

**关键**：
- `providers.tsx` 是 `'use client'` component
- `layout.tsx` 保持 server component（不添加 `'use client'`）
- Project ID 缺失时 WagmiAdapter 仍可创建（projectId 为空字符串），不会导致 build 失败
- UI 层在 `wallet-connect.tsx` 中检查 projectId 是否存在，不存在时显示友好提示

### wallet-connect.tsx

```typescript
// components/wallet-connect.tsx
'use client'

import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { useDisconnect, useBalance } from 'wagmi'
import { arcTestnet } from '@/lib/arc'

export function WalletConnect() {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

  if (!projectId) {
    return (
      <div className="text-sm text-muted-foreground">
        WalletConnect Project ID not configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local.
      </div>
    )
  }

  return <WalletConnectInner />
}

function WalletConnectInner() {
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

## 6. 合约 ABI 和地址（硬编码）

### 强约束：不从 contracts/out/ 导入

在 `lib/contracts.ts` 中硬编码最小 ABI，只包含本 Task 用到的函数。

合约地址从 `process.env.NEXT_PUBLIC_*` 环境变量读取。地址缺失时 UI 显示友好错误，不让 build 失败。

```typescript
// lib/contracts.ts

// --- CopyGuardBondVault 最小 ABI ---
export const BOND_VAULT_ABI = [
  {
    type: 'function',
    name: 'createBond',
    inputs: [
      { name: 'leaderId', type: 'bytes32' },
      { name: 'riskThresholdBps', type: 'uint16' },
      { name: 'expiry', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'bonds',
    inputs: [{ name: 'bondId', type: 'uint256' }],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'follower', type: 'address' },
      { name: 'leaderId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
      { name: 'createdAt', type: 'uint256' },
      { name: 'expiry', type: 'uint256' },
      { name: 'riskThresholdBps', type: 'uint16' },
      { name: 'lastRiskScoreBps', type: 'uint16' },
      { name: 'lastReportHash', type: 'bytes32' },
      { name: 'state', type: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nextBondId',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

// --- ReportPayment 最小 ABI（保留但本 Task 不调用）---
export const REPORT_PAYMENT_ABI = [
  {
    type: 'function',
    name: 'purchaseReport',
    inputs: [{ name: 'leaderId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'hasPurchased',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'leaderId', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const

// --- 合约地址（从环境变量读取）---
export const BOND_VAULT_ADDRESS = (process.env.NEXT_PUBLIC_BOND_VAULT_ADDRESS || '') as `0x${string}`
export const REPORT_PAYMENT_ADDRESS = (process.env.NEXT_PUBLIC_REPORT_PAYMENT_ADDRESS || '') as `0x${string}`

// --- Helper: string → bytes32（右填充零）---
export function stringToBytes32(str: string): `0x${string}` {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  const padded = new Uint8Array(32)
  padded.set(bytes)
  return `0x${Array.from(padded).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`
}
```

**强约束**：
- 不要从 `../../contracts/out` 动态导入 ABI
- 不要在模块顶层 `throw new Error(...)` 导致 build 失败
- 地址缺失时 UI 层友好报错

## 7. API Types 和 Hooks 组织

### hooks 组织规范

- `lib/api.ts` — 只放 TypeScript type 定义和 fetcher 函数
- `hooks/use-leaders.ts` — 只放 TanStack Query hooks（useLeaders / useLeader / useRisk）
- 不要在两个文件中重复定义相同 hooks

### lib/api.ts

```typescript
// lib/api.ts
// TypeScript types + fetcher functions（不含 TanStack Query hooks）

export interface Leader {
  id: string
  name: string
  venue: string
  metrics: LeaderMetrics
}

export interface LeaderMetrics {
  pnl7d: number
  pnl30d: number
  maxDrawdown7d: number
  maxDrawdown30d: number
  winRate7d: number
  winRate30d: number
  avgLeverage: number
  positionConcentration: number
  tradeFrequencyChange: number
}

export interface LeaderDetail {
  id: string
  name: string
  venue: string
  metrics: LeaderMetrics
  metricsHistory: Array<{ date: string; metrics: LeaderMetrics }>
}

export interface RiskSummary {
  leaderId: string
  riskScoreBps: number
  action: string
  confidenceBps: number
  summaryReason: string
}

export async function fetchLeaders(): Promise<Leader[]> {
  const res = await fetch('/api/leaders')
  if (!res.ok) throw new Error('Failed to fetch leaders')
  return res.json()
}

export async function fetchLeader(id: string): Promise<LeaderDetail> {
  const res = await fetch(`/api/leaders/${id}`)
  if (!res.ok) throw new Error('Failed to fetch leader')
  return res.json()
}

export async function fetchRisk(id: string): Promise<RiskSummary> {
  const res = await fetch(`/api/risk/${id}`)
  if (!res.ok) throw new Error('Failed to fetch risk')
  return res.json()
}
```

### hooks/use-leaders.ts

```typescript
// hooks/use-leaders.ts
// TanStack Query hooks — 调用 lib/api.ts 的 fetcher

import { useQuery } from '@tanstack/react-query'
import { fetchLeaders, fetchLeader, fetchRisk } from '@/lib/api'

export function useLeaders() {
  return useQuery({
    queryKey: ['leaders'],
    queryFn: fetchLeaders,
  })
}

export function useLeader(id: string) {
  return useQuery({
    queryKey: ['leader', id],
    queryFn: () => fetchLeader(id),
    enabled: !!id,
  })
}

export function useRisk(id: string) {
  return useQuery({
    queryKey: ['risk', id],
    queryFn: () => fetchRisk(id),
    enabled: !!id,
  })
}
```

## 8. CopyGuardBondVault createBond 调用

### 合约签名

```solidity
function createBond(bytes32 leaderId, uint16 riskThresholdBps, uint256 expiry) external payable
```

### wagmi 调用方式

```typescript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { BOND_VAULT_ADDRESS, BOND_VAULT_ABI, stringToBytes32 } from '@/lib/contracts'

const { writeContract, data: txHash } = useWriteContract()
const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

writeContract({
  address: BOND_VAULT_ADDRESS,
  abi: BOND_VAULT_ABI,
  functionName: 'createBond',
  args: [
    stringToBytes32(leader.id),  // bytes32 — 右填充零
    7000,                        // uint16 — riskThresholdBps 默认 7000
    BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),  // uint256 — 30 天后
  ],
  value: parseUnits(amount, 18),  // msg.value = USDC 数量（18 decimals）
})
```

### 参数约束

| 参数 | 类型 | 说明 |
|---|---|---|
| leaderId | bytes32 | ASCII 右填充零，使用 stringToBytes32() |
| riskThresholdBps | uint16 | 默认 7000 |
| expiry | uint256 | 默认当前时间 + 30 天 |
| msg.value | uint256 | parseUnits(amount, 18)，不是 parseEther |

**重要**：
- 不要假设 ERC20 `approve` / `transferFrom`，Arc 上 USDC 是 native currency
- 使用 `parseUnits(amount, 18)` 而非 `parseEther(amount)`
- 不要调用后端 `run-risk-check`，本 Task 只创建 bond

### createBond 成功后

显示 txHash 和 Arcscan 链接：

```typescript
{isSuccess && txHash && (
  <div>
    <p>Bond created!</p>
    <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank">
      View on Arcscan
    </a>
  </div>
)}
```

## 9. 页面结构

### app/layout.tsx（server component）

- metadata: title="CopyGuard Bond", description="Arc-native social trading protection layer"
- 用 `<Providers>` 包裹 `{children}`
- 保持 Geist font 和 globals.css
- **不加** `'use client'`，保持 server component

### app/page.tsx（基础首页）

- Hero section: "CopyGuard Bond" + tagline
- WalletConnect 组件
- 简单展示：Total Leaders 数量（从 useLeaders 获取 count）
- "View Leaders" CTA 按钮 → `/leaders`
- 不做复杂 dashboard polish，不做完整 metrics 聚合

### app/leaders/page.tsx

- fetch useLeaders + useRisk for each leader
- grid of LeaderCards
- 每张 card 显示 risk score + action badge
- loading / error 状态

### app/leaders/[id]/page.tsx

Leader 详情页，3 个区域：
1. **Leader Profile**：name, venue, metrics summary
2. **Risk Card**：risk score + action + confidence + summaryReason
3. **Bond Section**：
   - 已连接钱包：BondCreateModal 按钮
   - 未连接钱包："Connect wallet to create bonds"
   - createBond 成功后显示 txHash + Arcscan 链接
4. **Report 区域**：只显示 placeholder "Full report unlock coming soon"（不实现 x402 flow）

### app/events/page.tsx（placeholder）

- 页面必须存在
- 显示 placeholder 文本："On-chain event stream coming soon"
- 不做真实 viem getLogs
- 不做 event-feed.tsx 组件
- 不做 5 秒自动刷新

### components/leader-card.tsx

- name, venue
- riskScoreBps 颜色编码：green <3000, yellow 3000-7000, red >7000
- action badge：FOLLOW(green), REDUCE(yellow), EXIT(red)
- confidenceBps
- 链接到 `/leaders/${id}`

### components/risk-card.tsx

- riskScoreBps 进度条（0-10000，颜色渐变）
- action badge
- confidenceBps
- summaryReason

### components/bond-create-modal.tsx

- amount 输入（USDC 数量，如 "1"）
- riskThresholdBps 显示（默认 7000，可只读）
- expiry 显示（默认 30 天，可只读）
- 提交按钮 → useWriteContract 调用 createBond
- 状态显示：idle → confirming → pending → confirmed/failed
- 成功后显示 txHash（链接到 `testnet.arcscan.app/tx/${txHash}`）
- 未连接钱包时禁用提交按钮
- BOND_VAULT_ADDRESS 缺失时显示 "Contract address not configured"

## 10. Client Component 边界

只有使用 hooks / wagmi / query 的组件加 `'use client'`：

| 文件 | `'use client'` | 说明 |
|---|---|---|
| `app/layout.tsx` | **NO** | server component，导出 metadata |
| `app/providers.tsx` | **YES** | 使用 WagmiProvider |
| `components/wallet-connect.tsx` | **YES** | 使用 wagmi hooks |
| `components/bond-create-modal.tsx` | **YES** | 使用 useWriteContract |
| `components/leader-card.tsx` | **YES** | 使用 useRisk hook 或接收 props |
| `components/risk-card.tsx` | **YES** | 或接收 props |
| `app/leaders/page.tsx` | **YES** | 使用 useLeaders hook |
| `app/leaders/[id]/page.tsx` | **YES** | 使用 useLeader/useRisk hooks |
| `app/page.tsx` | **YES** | 使用 useLeaders hook |
| `app/events/page.tsx` | **NO** | 纯静态 placeholder |

## 11. Codex 执行 Prompt

> 将以下内容完整粘贴给 Codex 执行。

---

你正在为 CopyGuard Bond 项目搭建 Next.js 15 前端的最小可运行骨架。前端代码在 `apps/web/`。

### 当前状态

- Next.js 15 已初始化（App Router + TypeScript + Tailwind + shadcn/ui）
- `apps/web/next.config.js` 已有 API rewrite `/api/*` → `localhost:8000`
- `apps/web/components/ui/` 已有 shadcn/ui 组件
- **没有安装 web3 依赖**（wagmi, viem, @reown/appkit 等）

### 已部署合约（Arc Testnet chainId 5042002）

```
CopyGuardBondVault: 0x822bBEF75F14744d11BaC553997Bd908dBE49B47
LeaderRegistry: 0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967
RiskOracleAdapter: 0x63109ECE16d78A5cEc5499F7f154e107549f7965
ReportPayment: 0x15832FA84424E257ACf3735e905E9a5d3B33ee82
```

### 合约函数签名

**CopyGuardBondVault**：
- `createBond(bytes32 leaderId, uint16 riskThresholdBps, uint256 expiry)` — payable
- `bonds(uint256 bondId)` — view
- `nextBondId()` — view, returns uint256

**ReportPayment**：
- `purchaseReport(bytes32 leaderId)` — payable, msg.value = 1e18
- `hasPurchased(address user, bytes32 leaderId)` — view, returns bool

### FastAPI 后端 Endpoints（localhost:8000，通过 next.config.js proxy）

- `GET /api/leaders` — 返回 5 个 leader 列表
- `GET /api/leaders/:id` — 返回 leader 详情 + metricsHistory
- `GET /api/risk/:id` — 返回 {leaderId, riskScoreBps, action, confidenceBps, summaryReason}

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
- 使用 `WagmiAdapter` from `@reown/appkit-adapter-wagmi`
- networks: [arcTestnet]
- projectId 从 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`，空字符串作为 fallback
- SSR: true
- 导出 `wagmiAdapter.wagmiConfig` 作为 config
- **不使用** `<AppKit />` 组件

#### Step 4: 创建 lib/contracts.ts

硬编码最小 ABI（不从 `../../contracts/out/` 导入）：
- `BOND_VAULT_ABI`：只包含 createBond, bonds, nextBondId
- `REPORT_PAYMENT_ABI`：purchaseReport, hasPurchased（保留但不调用）
- 合约地址从 `process.env.NEXT_PUBLIC_*` 读取，空字符串作为 fallback
- `stringToBytes32(str)` helper 函数（ASCII 右填充零）
- 地址缺失时不 throw，UI 层负责友好提示

#### Step 5: 创建 lib/api.ts

TypeScript types + fetcher 函数（不含 TanStack Query hooks）：
- Types: Leader, LeaderMetrics, LeaderDetail, RiskSummary
- Fetchers: fetchLeaders(), fetchLeader(id), fetchRisk(id)
- 所有 fetch 走 `/api/...`（经过 next.config.js proxy）

#### Step 6: 创建 hooks/use-leaders.ts

TanStack Query hooks（调用 lib/api.ts 的 fetcher）：
- `useLeaders()` — queryKey: ['leaders']
- `useLeader(id)` — queryKey: ['leader', id], enabled: !!id
- `useRisk(id)` — queryKey: ['risk', id], enabled: !!id

#### Step 7: 创建 app/providers.tsx

Client component (`'use client'`)：
- WagmiProvider (config from wagmi.ts)
- QueryClientProvider
- 调用 `createAppKit(...)` 初始化（只在 `typeof window !== 'undefined'` 且 projectId 存在时）
- metadata: { name: 'CopyGuard Bond', description: 'Arc-native social trading protection layer', url: 'http://localhost:3000', icons: ['/icon.png'] }
- defaultNetwork: arcTestnet
- **不导入或使用** `<AppKit />` 组件

#### Step 8: 创建 components/wallet-connect.tsx

Client component：
- 检查 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` 是否存在
- 不存在时显示友好提示："WalletConnect Project ID not configured"
- 存在时渲染 WalletConnectInner：
  - `useAppKit()` 的 `open()` 打开连接
  - `useAppKitAccount()` 获取 address, isConnected
  - `useDisconnect()` 断开连接
  - `useBalance` (wagmi) 显示 USDC 余额
  - 已连接：地址缩写 + USDC 余额 + disconnect
  - 未连接：Connect Wallet 按钮

#### Step 9: 创建 components/leader-card.tsx

Leader 列表卡片（接收 props）：
- name, venue
- riskScoreBps 颜色编码：green <3000, yellow 3000-7000, red >7000
- action badge：FOLLOW(green), REDUCE(yellow), EXIT(red)
- confidenceBps
- 链接到 `/leaders/${id}`

#### Step 10: 创建 components/risk-card.tsx

Risk 信息卡片（接收 props）：
- riskScoreBps 进度条（0-10000，颜色渐变）
- action badge
- confidenceBps
- summaryReason

#### Step 11: 创建 components/bond-create-modal.tsx

createBond 表单：
- amount 输入（USDC 数量）
- riskThresholdBps 显示（默认 7000，只读）
- expiry 显示（默认 30 天，只读）
- 提交 → useWriteContract 调用 createBond
  - leaderId: `stringToBytes32(leader.id)`
  - riskThresholdBps: 7000
  - expiry: `BigInt(Math.floor(Date.now() / 1000) + 30 * 86400)`
  - value: `parseUnits(amount, 18)`
- 状态显示：idle → pending → confirmed/failed
- 成功后显示 txHash + Arcscan 链接
- BOND_VAULT_ADDRESS 缺失时显示 "Contract address not configured"
- 未连接钱包时禁用提交

#### Step 12: 更新 app/layout.tsx

- metadata: title="CopyGuard Bond", description="Arc-native social trading protection layer"
- 用 `<Providers>` 包裹 `{children}`
- 保持 server component（不加 `'use client'`）
- 保持 Geist font 和 globals.css

#### Step 13: 更新 app/page.tsx（基础首页）

- Hero section: "CopyGuard Bond" + tagline + 简短描述
- WalletConnect 组件
- Total Leaders 数量（从 useLeaders 获取 count）
- "View Leaders" CTA 按钮 → `/leaders`
- 不做复杂 dashboard polish

#### Step 14: 创建 app/leaders/page.tsx

- 使用 useLeaders() + useRisk(id) for each leader
- grid of LeaderCards
- loading / error 状态

#### Step 15: 创建 app/leaders/[id]/page.tsx

Leader 详情页：
1. Leader Profile: name, venue, metrics summary
2. RiskCard: risk score + action + confidence + summaryReason
3. BondCreateModal（需要钱包连接）
4. Report placeholder: "Full report unlock coming soon"

#### Step 16: 创建 app/events/page.tsx（placeholder）

- 页面存在
- 显示 "On-chain event stream coming soon"
- 不做真实 getLogs，不做 event-feed 组件，不做自动刷新

#### Step 17: 更新 .env.example

添加合约地址变量（见第 3 节）

#### Step 18: 验证

```bash
cd apps/web && npm run build
```

必须通过，无类型错误。

### 强约束

- **不修改** `contracts/` 下的任何文件
- **不修改** `agents/` 下的任何文件
- **不重新部署**合约
- **不提交**真实私钥
- **不修改** `next.config.js`（已有 API rewrite）
- **不使用** `<AppKit />` 组件，使用 `createAppKit()` 初始化
- **不从** `../../contracts/out/` 导入 ABI，在 `lib/contracts.ts` 中硬编码
- **不实现** x402 unlock flow（只放 placeholder）
- **不实现** 完整 MyBond 扫描
- **不实现** 真实 event getLogs
- **不调用** 后端 `run-risk-check`
- **不在循环中** 动态调用 useReadContract
- **不在模块顶层** throw new Error 导致 build 失败
- **保持** `layout.tsx` 为 server component
- **`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` 缺失时** npm run build 不能失败，UI 显示友好提示
- npm run build **必须通过**
- risk score 颜色：green <3000, yellow 3000-7000, red >7000
- 只使用 shadcn/ui + Tailwind，不引入大型 UI 框架

---

## 12. Task 8A 验收 Checklist

| # | 检查项 | 验证方式 |
|---|---|---|
| 1 | `npm run build` 通过 | `cd apps/web && npm run build` |
| 2 | web3 依赖已安装 | `cat apps/web/package.json` 确认 wagmi/viem/@reown/appkit |
| 3 | lib/arc.ts Arc chain config 正确（id=5042002, USDC native） | 读文件 |
| 4 | lib/wagmi.ts 使用 WagmiAdapter + createAppKit 模式 | 读文件 |
| 5 | lib/contracts.ts 硬编码最小 ABI（不从 contracts/out/ 导入） | 读文件 |
| 6 | lib/api.ts 只有 types + fetcher（无 TanStack Query hooks） | 读文件 |
| 7 | hooks/use-leaders.ts 有 useLeaders / useLeader / useRisk | 读文件 |
| 8 | app/providers.tsx 使用 createAppKit（非 `<AppKit />`） | 读文件 |
| 9 | layout.tsx 保持 server component，使用 Providers 包裹 | 读文件 |
| 10 | WalletConnect 组件：Project ID 缺失时显示友好提示，build 不失败 | 读文件 + npm run build |
| 11 | `/` 路由存在，有 Hero + WalletConnect + leader count | 读文件 |
| 12 | `/leaders` 路由存在，能展示 5 个 leaders + risk scores | 读文件 |
| 13 | `/leaders/[id]` 路由存在，展示 profile + risk card + bond section | 读文件 |
| 14 | BondCreateModal 调用 createBond，参数正确（bytes32, uint16, uint256, parseUnits） | 读文件 |
| 15 | createBond 成功后显示 txHash + Arcscan 链接 | 读文件 |
| 16 | `/events` 路由存在，允许 placeholder | 读文件 |
| 17 | 不要求完整 MyBond 扫描 | 无 bond-card.tsx / use-bonds.ts |
| 18 | 不要求真实 event logs | 无 event-feed.tsx / use-events.ts |
| 19 | 不要求 paid report unlock | 无 report-paywall.tsx |
| 20 | 未修改 `contracts/` | `git diff contracts/` 无变更 |
| 21 | 未修改 `agents/` | `git diff agents/` 无变更 |
| 22 | 未修改 `next.config.js` | `git diff apps/web/next.config.js` 无变更 |
