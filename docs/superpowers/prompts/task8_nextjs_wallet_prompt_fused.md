# Task 8A: Next.js Frontend + Reown AppKit Wallet + Leader API + createBond 最小闭环

> 本 Task 只完成前端最小闭环：钱包连接、leaders/risk 展示、leader detail、createBond 调用、txHash 展示、events placeholder。
>
> 不实现完整 MyBond 扫描、不读取真实 event logs、不实现 x402 unlock、不调用后端 run-risk-check、不进入 Task 9/10。

\---

## 0\. 范围边界

### 本 Task 要做

1. Next.js 15 前端基础页面结构；
2. Reown AppKit + wagmi + viem 钱包连接；
3. Arc Testnet chain config；
4. 通过 Next.js rewrite 调用 FastAPI：

   * `GET /api/leaders`
   * `GET /api/leaders/{id}`
   * `GET /api/risk/{id}`
5. `/` 基础首页；
6. `/leaders` 列表页；
7. `/leaders/\[id]` 详情页；
8. `CopyGuardBondVault.createBond(bytes32,uint16,uint256)` 前端调用；
9. 创建 bond 成功后展示 txHash + Arcscan 链接；
10. `/events` placeholder 页面；
11. `cd apps/web \&\& npm run build` 必须通过。

### 本 Task 不做

1. 不做完整 MyBond 扫描；
2. 不创建 `hooks/use-bonds.ts`；
3. 不在循环中动态调用多个 `useReadContract`；
4. 不做真实链上 `event getLogs`；
5. 不创建 `hooks/use-events.ts`；
6. 不创建复杂 `event-feed.tsx`，`/events` 直接 placeholder 即可；
7. 不实现完整 x402 unlock flow；
8. 不调用 `ReportPayment.purchaseReport`；
9. 不调用后端 `POST /api/oracle/run-risk-check`；
10. 不修改 `contracts/`；
11. 不修改 `agents/`；
12. 不修改 `apps/web/next.config.js`；
13. 不重新部署合约；
14. 不进入 Task 9/10 的复杂 UI polish。

\---

## 1\. 目标

在 `apps/web/` 中实现一个可构建、可演示的 MVP 前端：

* 钱包连接：Reown AppKit + wagmi + viem；
* 网络：Arc Testnet，chainId `5042002`，native token 为 `USDC`；
* 数据展示：调用 FastAPI proxy `/api/leaders`、`/api/leaders/{id}`、`/api/risk/{id}`；
* 合约交互：用户在 leader detail 页面调用 `CopyGuardBondVault.createBond` 创建 bond；
* 结果展示：创建成功后展示 txHash 和 Arcscan 链接；
* 构建：`cd apps/web \&\& npm run build` 必须通过。

\---

## 2\. 需要创建/修改的文件

### 创建

|文件|说明|
|-|-|
|`apps/web/lib/arc.ts`|Arc Testnet chain config|
|`apps/web/lib/wagmi.ts`|Reown + wagmi config|
|`apps/web/lib/contracts.ts`|最小 ABI + 合约地址 + stringToBytes32|
|`apps/web/lib/api.ts`|TypeScript types + fetcher|
|`apps/web/hooks/use-leaders.ts`|TanStack Query hooks|
|`apps/web/app/providers.tsx`|Client provider: WagmiProvider + QueryClientProvider + createAppKit|
|`apps/web/components/wallet-connect.tsx`|钱包连接按钮|
|`apps/web/components/leader-card.tsx`|Leader 列表卡片|
|`apps/web/components/risk-card.tsx`|Risk 信息卡片|
|`apps/web/components/bond-create-modal.tsx`|createBond 表单/卡片|
|`apps/web/app/leaders/page.tsx`|Leaders 列表页|
|`apps/web/app/leaders/\[id]/page.tsx`|Leader 详情页|
|`apps/web/app/events/page.tsx`|Events placeholder|

### 修改

|文件|说明|
|-|-|
|`apps/web/package.json`|新增 web3 依赖|
|`package-lock.json`|`npm install` 自动修改可接受|
|`apps/web/app/layout.tsx`|使用 Providers 包裹 children，保持 server component|
|`apps/web/app/page.tsx`|基础首页|
|`apps/web/.env.example`|添加前端变量和合约地址|

### 不修改

* `apps/web/next.config.js`
* `contracts/\*\*`
* `agents/\*\*`
* `.env`
* `.env.local`
* 任何私钥/API key 文件

\---

## 3\. 前端环境变量

更新 `apps/web/.env.example`：

```env
NEXT\_PUBLIC\_ARC\_RPC\_URL=https://rpc.testnet.arc.network
NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID=your\_walletconnect\_project\_id
NEXT\_PUBLIC\_FASTAPI\_URL=http://localhost:8000
NEXT\_PUBLIC\_BOND\_VAULT\_ADDRESS=0x822bBEF75F14744d11BaC553997Bd908dBE49B47
NEXT\_PUBLIC\_REPORT\_PAYMENT\_ADDRESS=0x15832FA84424E257ACf3735e905E9a5d3B33ee82
NEXT\_PUBLIC\_LEADER\_REGISTRY\_ADDRESS=0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967
NEXT\_PUBLIC\_RISK\_ORACLE\_ADAPTER\_ADDRESS=0x63109ECE16d78A5cEc5499F7f154e107549f7965
```

要求：

* 用户本地可以创建 `apps/web/.env.local`，但不要提交；
* `NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID` 缺失时，`npm run build` 不能失败；
* 不允许在模块顶层 `throw new Error("missing project id")`；
* 钱包按钮显示友好提示：`WalletConnect Project ID not configured`；
* 合约地址缺失时也不能导致 build 失败，应在 UI 中友好提示。

\---

## 4\. Arc Testnet Chain Config

创建 `apps/web/lib/arc.ts`：

```ts
import { defineChain } from 'viem'

export const ARC\_CHAIN\_ID = 5042002
export const ARC\_EXPLORER\_URL = 'https://testnet.arcscan.app'

export const arcTestnet = defineChain({
  id: ARC\_CHAIN\_ID,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: \[process.env.NEXT\_PUBLIC\_ARC\_RPC\_URL || 'https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arcscan',
      url: ARC\_EXPLORER\_URL,
    },
  },
})

export function txUrl(txHash: string) {
  return `${ARC\_EXPLORER\_URL}/tx/${txHash}`
}
```

\---

## 5\. Reown AppKit / wagmi / viem 集成要求

### 安装依赖

在 `apps/web` 中执行：

```bash
npm install @reown/appkit @reown/appkit-adapter-wagmi wagmi viem@2.x @tanstack/react-query
```

### 强约束

1. 不要使用 `<AppKit />` 组件；
2. 使用 `createAppKit(...)` 初始化；
3. 使用 `WagmiAdapter`；
4. `providers.tsx` 是 client component；
5. `layout.tsx` 保持 server component；
6. 缺少 `NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID` 时 build 不能失败；
7. 缺少 projectId 时 UI 显示友好提示；
8. 只支持 Arc Testnet；
9. `defaultNetwork` 使用 Arc Testnet；
10. 如果当前 Reown / wagmi 版本的类型与示例略有不同，以 `npm run build` 通过为准做最小调整，但不能改动上述设计原则。

### `apps/web/lib/wagmi.ts`

```ts
import { cookieStorage, createStorage, http } from 'wagmi'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { arcTestnet } from './arc'

export const projectId = process.env.NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID || ''
export const networks = \[arcTestnet] as const

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
  transports: {
    \[arcTestnet.id]: http(process.env.NEXT\_PUBLIC\_ARC\_RPC\_URL || 'https://rpc.testnet.arc.network'),
  },
  storage: createStorage({
    storage: cookieStorage,
  }),
})

export const config = wagmiAdapter.wagmiConfig
```

### `apps/web/app/providers.tsx`

```tsx
'use client'

import { type ReactNode, useState } from 'react'
import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config, projectId, wagmiAdapter, networks } from '@/lib/wagmi'
import { arcTestnet } from '@/lib/arc'

const metadata = {
  name: 'CopyGuard Bond',
  description: 'Arc-native social trading protection layer',
  url: process.env.NEXT\_PUBLIC\_APP\_URL || 'http://localhost:3000',
  icons: \['https://avatars.githubusercontent.com/u/179229932'],
}

let appKitInitialized = false

function ensureAppKit() {
  if (appKitInitialized || !projectId) return

  createAppKit({
    adapters: \[wagmiAdapter],
    networks,
    projectId,
    metadata,
    defaultNetwork: arcTestnet,
  })

  appKitInitialized = true
}

export function Providers({ children }: { children: ReactNode }) {
  const \[queryClient] = useState(() => new QueryClient())

  ensureAppKit()

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

如该写法因当前依赖版本报类型错误，允许 Codex 做最小类型修正，但必须保留：

* `WagmiAdapter`
* `createAppKit`
* `adapters: \[wagmiAdapter]`
* `defaultNetwork: arcTestnet`
* 缺少 projectId 不崩溃
* build 通过

\---

## 6\. 合约地址和最小 ABI

创建 `apps/web/lib/contracts.ts`。

### 地址读取

地址从环境变量读取，并提供当前部署地址作为 fallback。不要在模块顶层 throw。

```ts
export const BOND\_VAULT\_ADDRESS =
  (process.env.NEXT\_PUBLIC\_BOND\_VAULT\_ADDRESS || '0x822bBEF75F14744d11BaC553997Bd908dBE49B47') as `0x${string}`

export const REPORT\_PAYMENT\_ADDRESS =
  (process.env.NEXT\_PUBLIC\_REPORT\_PAYMENT\_ADDRESS || '0x15832FA84424E257ACf3735e905E9a5d3B33ee82') as `0x${string}`

export const LEADER\_REGISTRY\_ADDRESS =
  (process.env.NEXT\_PUBLIC\_LEADER\_REGISTRY\_ADDRESS || '0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967') as `0x${string}`

export const RISK\_ORACLE\_ADAPTER\_ADDRESS =
  (process.env.NEXT\_PUBLIC\_RISK\_ORACLE\_ADAPTER\_ADDRESS || '0x63109ECE16d78A5cEc5499F7f154e107549f7965') as `0x${string}`
```

### 最小 ABI

只包含 Task 8A 用到的函数。不要从 `../../contracts/out` 动态导入 ABI。

```ts
export const BOND\_VAULT\_ABI = \[
  {
    type: 'function',
    name: 'createBond',
    stateMutability: 'payable',
    inputs: \[
      { name: 'leaderId', type: 'bytes32' },
      { name: 'riskThresholdBps', type: 'uint16' },
      { name: 'expiry', type: 'uint256' },
    ],
    outputs: \[],
  },
  {
    type: 'function',
    name: 'nextBondId',
    stateMutability: 'view',
    inputs: \[],
    outputs: \[{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'bonds',
    stateMutability: 'view',
    inputs: \[{ name: '', type: 'uint256' }],
    outputs: \[
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
  },
] as const

export const REPORT\_PAYMENT\_ABI = \[
  {
    type: 'function',
    name: 'purchaseReport',
    stateMutability: 'payable',
    inputs: \[{ name: 'leaderId', type: 'bytes32' }],
    outputs: \[],
  },
  {
    type: 'function',
    name: 'hasPurchased',
    stateMutability: 'view',
    inputs: \[
      { name: 'user', type: 'address' },
      { name: 'leaderId', type: 'bytes32' },
    ],
    outputs: \[{ name: '', type: 'bool' }],
  },
] as const
```

### `stringToBytes32`

合约里的 leaderId 是 `bytes32("hl\_leader\_03")`，即 ASCII 字符串右填充零：

```ts
export function stringToBytes32(str: string): `0x${string}` {
  const bytes = new TextEncoder().encode(str)

  if (bytes.length > 32) {
    throw new Error('String is too long for bytes32')
  }

  const padded = new Uint8Array(32)
  padded.set(bytes)

  const hex = Array.from(padded)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return `0x${hex}` as `0x${string}`
}
```

\---

## 7\. API 类型与 hooks 组织

### 文件职责

* `lib/api.ts`：只放 TypeScript types + fetcher；
* `hooks/use-leaders.ts`：只放 TanStack Query hooks；
* 不要在两个文件中重复定义 `useLeaders/useLeader/useRisk`；
* 所有请求通过 `/api/...`，不要直接写 `localhost:8000`。

### `apps/web/lib/api.ts`

```ts
export type LeaderMetrics = {
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

export type Leader = {
  id: string
  name: string
  venue: string
  metrics: LeaderMetrics
}

export type LeaderSnapshot = {
  date: string
  metrics: LeaderMetrics
}

export type LeaderDetail = Leader \& {
  metricsHistory: LeaderSnapshot\[]
}

export type RiskSummary = {
  leaderId: string
  riskScoreBps: number
  action: 'FOLLOW' | 'REDUCE' | 'EXIT'
  confidenceBps: number
  summaryReason: string
}

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<T>
}
```

### `apps/web/hooks/use-leaders.ts`

```ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchJson, type Leader, type LeaderDetail, type RiskSummary } from '@/lib/api'

export function useLeaders() {
  return useQuery({
    queryKey: \['leaders'],
    queryFn: () => fetchJson<Leader\[]>('/api/leaders'),
  })
}

export function useLeader(id: string) {
  return useQuery({
    queryKey: \['leader', id],
    queryFn: () => fetchJson<LeaderDetail>(`/api/leaders/${id}`),
    enabled: Boolean(id),
  })
}

export function useRisk(id: string) {
  return useQuery({
    queryKey: \['risk', id],
    queryFn: () => fetchJson<RiskSummary>(`/api/risk/${id}`),
    enabled: Boolean(id),
  })
}
```

\---

## 8\. Components

### `components/wallet-connect.tsx`

要求：

* client component；
* 使用 Reown hooks；
* `projectId` 缺失时显示友好提示，不崩溃；
* 未连接显示 Connect Wallet；
* 已连接显示地址缩写、USDC balance、disconnect；
* balance 使用 Arc Testnet chainId。

可用：

```ts
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { useDisconnect, useBalance } from 'wagmi'
```

如果当前安装版本的 Reown hook 名称有变化，以 build 通过为准最小调整。

### `components/leader-card.tsx`

展示：

* leader name；
* venue；
* risk score；
* action badge；
* confidence；
* summary reason；
* 链接 `/leaders/{id}`。

风险颜色：

* `<3000` green；
* `3000–7000` yellow；
* `>7000` red。

### `components/risk-card.tsx`

展示：

* `riskScoreBps`；
* 进度条或 ring；
* action badge；
* confidenceBps；
* summaryReason。

### `components/bond-create-modal.tsx`

MVP 可用普通 card/form，不强制真正 modal。要求：

* client component；
* 接收 `leaderId: string`；
* amount 输入，默认 `"1"`；
* riskThresholdBps 显示或输入，默认 `7000`；
* expiry 默认 30 天；
* 点击创建时调用 `useWriteContract`；
* `leaderId` 使用 `stringToBytes32(leaderId)`；
* `value` 使用 `parseUnits(amount, 18)`，不要用 `parseEther`；
* 成功后用 `useWaitForTransactionReceipt` 等确认；
* 显示 txHash 和 Arcscan 链接；
* 未连接钱包时显示 “Connect wallet to create bonds”；
* 不调用后端 `run-risk-check`；
* 不要求解析 bondId。

\---

## 9\. Pages

### `app/layout.tsx`

要求：

* 保持 server component，不加 `'use client'`；
* 保持 metadata 导出；
* 用 `<Providers>{children}</Providers>` 包裹；
* 不破坏全局样式和字体。

### `app/page.tsx`

首页基础版：

* Hero：`CopyGuard Bond`；
* tagline：`Arc-native protection layer for copy-trading followers`；
* WalletConnect；
* 展示 3 个基础 metric cards：

  * `5 mock leaders`
  * `Arc Testnet deployed`
  * `x402 paid report ready`
* CTA：`View Leaders`、`View Events`；
* 可做简洁暗色科技风，但不要复杂动画。

### `app/leaders/page.tsx`

要求：

* client component；
* 使用 `useLeaders()` 获取 5 个 leader；
* 每个 leader 展示 risk summary；
* 可在子组件中用 `useRisk(id)`；
* loading / error / empty state 完整；
* grid 布局；
* 每张 card 链接到 `/leaders/{id}`。

### `app/leaders/\[id]/page.tsx`

要求：

* client component；
* 使用 `useParams()` 获取 id；
* 使用 `useLeader(id)` 和 `useRisk(id)`；
* 四个区域：

  1. Leader Profile；
  2. Risk Card；
  3. Bond Create；
  4. Report Placeholder；
* Report Placeholder 只显示说明：

  * `Full report unlock coming soon`
  * `x402 unlock flow will be implemented later`
* 不实现真实 x402 unlock；
* 不调用 `purchaseReport`。

### `app/events/page.tsx`

要求：

* 可为 server component；
* 页面必须存在；
* 显示 `On-chain event stream coming soon`；
* 不创建 event-feed 复杂组件；
* 不做真实链上日志读取；
* 不做 5 秒自动刷新。

\---

## 10\. createBond 调用规则

合约签名：

```solidity
function createBond(bytes32 leaderId, uint16 riskThresholdBps, uint256 expiry) external payable
```

前端调用：

```ts
writeContract({
  address: BOND\_VAULT\_ADDRESS,
  abi: BOND\_VAULT\_ABI,
  functionName: 'createBond',
  args: \[
    stringToBytes32(leaderId),
    Number(riskThresholdBps),
    BigInt(expiryTimestamp),
  ],
  value: parseUnits(amount, 18),
  chainId: arcTestnet.id,
})
```

注意：

* `riskThresholdBps` 必须是 number，默认 `7000`；
* `expiryTimestamp` 用 `Math.floor(Date.now() / 1000) + 30 \* 86400`；
* `value` 是 native USDC，使用 `parseUnits(amount, 18)`；
* 不要使用 ERC20 `approve` / `transferFrom`；
* 不要使用 `parseEther(amount)`；
* 不要修改合约；
* 不要假设 bondId 可从 tx receipt 直接解析，Task 8A 成功后只展示 txHash。

\---

## 11\. Codex 执行 Prompt

将下面内容完整粘贴给 Codex 执行。

\---

你正在为 CopyGuard Bond 项目实现 Task 8A：Next.js 前端基础、钱包连接、leaders/risk 展示和 createBond 最小闭环。

项目路径：`apps/web/`

### 当前状态

* Next.js 15 已初始化；
* App Router + TypeScript + Tailwind；
* shadcn/ui 已存在；
* `apps/web/next.config.js` 已有 `/api/\*` → `localhost:8000` rewrite，不要修改；
* 后端 FastAPI 已有：

  * `GET /api/leaders`
  * `GET /api/leaders/{id}`
  * `GET /api/risk/{id}`
  * `GET /api/reports/{id}`
  * `POST /api/oracle/run-risk-check`

### 已部署合约

Arc Testnet chainId：`5042002`

```txt
CopyGuardBondVault: 0x822bBEF75F14744d11BaC553997Bd908dBE49B47
LeaderRegistry: 0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967
RiskOracleAdapter: 0x63109ECE16d78A5cEc5499F7f154e107549f7965
ReportPayment: 0x15832FA84424E257ACf3735e905E9a5d3B33ee82
```

### 需要安装依赖

```bash
cd apps/web
npm install @reown/appkit @reown/appkit-adapter-wagmi wagmi viem@2.x @tanstack/react-query
```

### 需要创建

* `apps/web/lib/arc.ts`
* `apps/web/lib/wagmi.ts`
* `apps/web/lib/contracts.ts`
* `apps/web/lib/api.ts`
* `apps/web/hooks/use-leaders.ts`
* `apps/web/app/providers.tsx`
* `apps/web/components/wallet-connect.tsx`
* `apps/web/components/leader-card.tsx`
* `apps/web/components/risk-card.tsx`
* `apps/web/components/bond-create-modal.tsx`
* `apps/web/app/leaders/page.tsx`
* `apps/web/app/leaders/\[id]/page.tsx`
* `apps/web/app/events/page.tsx`

### 需要修改

* `apps/web/package.json`
* `package-lock.json`，如果 npm install 自动修改；
* `apps/web/app/layout.tsx`
* `apps/web/app/page.tsx`
* `apps/web/.env.example`

### 不要修改

* `apps/web/next.config.js`
* `contracts/\*\*`
* `agents/\*\*`
* `.env`
* `.env.local`
* 任何私钥/API key 文件

### Reown / wagmi 强约束

1. 不要使用 `<AppKit />` 组件；
2. 使用 `createAppKit(...)` 初始化；
3. 使用 `WagmiAdapter`；
4. `createAppKit` 传入 `adapters: \[wagmiAdapter]`；
5. `providers.tsx` 是 client component；
6. `layout.tsx` 保持 server component；
7. 缺少 `NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID` 时 build 不能失败；
8. 缺少 projectId 时 UI 显示友好提示；
9. 只支持 Arc Testnet；
10. 如果 Reown 版本类型不完全匹配，以 build 通过为准做最小修正，但不能使用 `<AppKit />`。

### API hooks 约束

1. `lib/api.ts` 只放 types + fetcher；
2. `hooks/use-leaders.ts` 只放 `useLeaders/useLeader/useRisk`；
3. 不要重复定义 hooks；
4. 通过 `/api/...` 访问 FastAPI proxy，不要直接写 `localhost:8000`。

### 合约约束

1. `lib/contracts.ts` 中硬编码最小 ABI；
2. 不从 `../../contracts/out` 动态导入 ABI；
3. `createBond` 参数必须是：

   * bytes32 leaderId；
   * uint16 riskThresholdBps；
   * uint256 expiry；
4. leaderId 使用 ASCII 右填充零转 bytes32；
5. `value` 使用 `parseUnits(amount, 18)`；
6. 不使用 `parseEther`；
7. 不使用 ERC20 approve / transferFrom；
8. 创建成功后只展示 txHash，不强制解析 bondId。

### 页面要求

1. `/` 首页：Hero + WalletConnect + 3 metric cards + CTA；
2. `/leaders`：5 个 leader cards + risk score；
3. `/leaders/\[id]`：leader profile + risk card + create bond + report placeholder；
4. `/events`：placeholder/skeleton，不做真实 getLogs。

### 不做的内容

1. 不做完整 MyBond 扫描；
2. 不创建 `hooks/use-bonds.ts`；
3. 不在循环中动态调用多个 `useReadContract`；
4. 不做真实 event `getLogs`；
5. 不创建 `hooks/use-events.ts`；
6. 不做完整 x402 unlock；
7. 不调用后端 `run-risk-check`；
8. 不实现 Task 9/10 的复杂 UI polish。

### 验证

运行：

```bash
cd apps/web
npm run build
```

必须通过，无 TypeScript/ESLint/build 错误。

完成后总结：

1. 修改了哪些文件；
2. 新增了哪些依赖；
3. 哪些页面已实现；
4. `npm run build` 是否通过；
5. 是否未修改 `contracts/`、`agents/`、`apps/web/next.config.js`。

\---

## 12\. 验收 Checklist

|#|检查项|验证方式|
|-|-|-|
|1|`npm run build` 通过|`cd apps/web \&\& npm run build`|
|2|web3 依赖已安装|`cat apps/web/package.json`|
|3|`lib/arc.ts` Arc chain config 正确|id=5042002, native USDC|
|4|`lib/wagmi.ts` 使用 WagmiAdapter|读文件|
|5|不使用 `<AppKit />`|grep|
|6|使用 `createAppKit(...)`|读文件|
|7|`createAppKit` 使用 `adapters: \[wagmiAdapter]`|读文件|
|8|缺少 projectId 不会 build 失败|读代码 + 构建|
|9|`providers.tsx` 是 client component|读文件|
|10|`layout.tsx` 保持 server component + metadata|读文件|
|11|`WalletConnect` 可渲染，含缺少 projectId 提示|读文件|
|12|`lib/contracts.ts` 硬编码最小 ABI|读文件|
|13|不从 `contracts/out` 动态导入 ABI|grep|
|14|`stringToBytes32` 右填充零|读文件|
|15|createBond 使用 `parseUnits(amount, 18)`|读文件|
|16|createBond 不使用 `parseEther`|grep|
|17|createBond 参数顺序正确|leaderId, riskThresholdBps, expiry|
|18|createBond 成功后显示 txHash + Arcscan 链接|读文件|
|19|`/` 首页存在 Hero + CTA|读文件|
|20|`/leaders` 页面存在|读文件|
|21|`/leaders/\[id]` 页面存在|读文件|
|22|`/events` 页面存在且为 placeholder|读文件|
|23|API hooks 通过 `/api/...` proxy|读文件|
|24|`lib/api.ts` 和 `hooks/use-leaders.ts` 不重复定义 hooks|读文件|
|25|不做完整 MyBond 扫描|无 `hooks/use-bonds.ts`|
|26|不做真实 `getLogs`|无 `hooks/use-events.ts` / 无 `getLogs`|
|27|不实现 x402 unlock flow|无真实 purchaseReport 调用|
|28|`.env.example` 包含合约地址|读文件|
|29|未修改 `contracts/`|`git diff contracts/` 无输出|
|30|未修改 `agents/`|`git diff agents/` 无输出|
|31|未修改 `apps/web/next.config.js`|`git diff apps/web/next.config.js` 无输出|

\---

## 13\. 通过标准

Task 8A 只有在以下条件都满足时才算 PASS：

1. `npm run build` 通过；
2. `/`、`/leaders`、`/leaders/\[id]`、`/events` 均存在；
3. `WalletConnect` 组件可构建；
4. `createBond` 代码路径存在且参数正确；
5. `NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID` 缺失不导致构建失败；
6. 不修改 `contracts/`；
7. 不修改 `agents/`；
8. 不修改 `apps/web/next.config.js`；
9. 未实现超出 Task 8A 范围的复杂 event/x402/bond scan 逻辑。

\---

## 14\. 后续任务预留

Task 8A 完成后，后续建议拆分：

* Task 8B：真实 MyBond 读取和用户 bond 状态；
* Task 9：Home Page / Demo UI polish；
* Task 10：x402 unlock flow + paid report；
* Task 11：Events getLogs + on-chain event stream。

