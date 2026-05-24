# Task 10C: ReportPaywall + x402 Unlock Flow — Codex 执行 Prompt（修正版）

> **范围**：前端付费报告解锁流程。替换 leader detail 页面的 "Full report unlock coming soon" placeholder。不修改后端、不修改合约。

> **修正重点**：本版已补充 `writeContractAsync`、`verificationError` 错误分支、`localStorage` 保存付款 txHash、以及 unlocked 状态展示 payment txHash + Arcscan 链接。

## 1. 目标

实现以下完整流程：

1. 展示 "Unlock Full Report — 1 USDC" 按钮
2. 用户点击 → 链上调用 `ReportPayment.purchaseReport(leaderId)` 付款 1 USDC
3. 交易确认后 → 带 `X-Payment-Tx-Hash` + `X-Wallet-Address` headers 重试 `/api/reports/:id`
4. 后端验证通过 → 展示完整 AI 风险报告
5. 后端验证失败 → 展示友好错误

## 2. 后端接口（已实现，不修改）

### `GET /api/reports/{leader_id}`

通过 next.config.js rewrite 代理到 `http://localhost:8000/api/reports/{leader_id}`。

**无付款头** → 402：
```json
{
  "status": 402,
  "message": "Payment required to unlock full risk report",
  "price": "1000000000000000000",
  "priceHuman": "1 USDC",
  "recipient": "0x15832FA84424E257ACf3735e905E9a5d3B33ee82",
  "resource": "report:hl_leader_03",
  "chainId": 5042002,
  "contractAddress": "0x15832FA84424E257ACf3735e905E9a5d3B33ee82",
  "instructions": "Call purchaseReport(leaderId) with msg.value = 1 USDC on Arc Testnet, then retry with X-Payment-Tx-Hash and X-Wallet-Address headers"
}
```

**带 headers `X-Payment-Tx-Hash` + `X-Wallet-Address`**：
- 验证失败 → 402 + `{...402 字段, "verificationError": "具体错误消息"}`
- 验证成功 → 200：
```json
{
  "leaderId": "hl_leader_03",
  "riskScoreBps": 7267,
  "degradationDetected": true,
  "action": "EXIT",
  "recommendedAllocationBps": 2733,
  "confidenceBps": 7500,
  "reasons": [
    "Drawdown acceleration exceeded safe threshold",
    "7d win rate dropped significantly below 30d baseline"
  ],
  "reportHash": "0xabc123..."
}
```

## 3. 已有前端资源

### apps/web/lib/contracts.ts（不修改，引用）

已有：
- `REPORT_PAYMENT_ABI` — 包含 `purchaseReport(bytes32 leaderId)` payable 和 `hasPurchased(address, bytes32) view`
- `REPORT_PAYMENT_ADDRESS` — `0x15832FA84424E257ACf3735e905E9a5d3B33ee82`
- `stringToBytes32(str)` — leader ID 转 bytes32

### apps/web/lib/arc.ts（不修改，引用）

已有：
- `arcTestnet.id` = 5042002
- `txUrl(hash)` — 生成 Arcscan 交易链接

### apps/web/lib/api.ts（需扩展）

当前只有 `fetchJson` 和 leader types。需要添加 report 相关 types 和 fetcher。

### apps/web/components/bond-create-modal.tsx（不修改，参考模式）

参考其 `useWriteContract` + `useWaitForTransactionReceipt` + `parseUnits` 模式，但本任务付款提交必须优先使用 `writeContractAsync`，便于捕获用户拒签、钱包错误、链错误和合约 revert。

## 4. 需要创建/修改的文件

| 操作 | 文件 | 说明 |
|---|---|---|
| 修改 | `apps/web/lib/api.ts` | 添加 report types + fetchReport 函数 |
| 创建 | `apps/web/components/report-paywall.tsx` | ReportPaywall 组件（状态机 + 付款 + 展示） |
| 修改 | `apps/web/app/leaders/[id]/page.tsx` | 替换 placeholder 为 `<ReportPaywall leaderId={leader.id} />` |

## 5. lib/api.ts 扩展

在现有文件末尾添加：

```typescript
// --- Report types ---

export type Report402Response = {
  status: 402
  message: string
  price: string
  priceHuman: string
  recipient: string
  resource: string
  chainId: number
  contractAddress: string
  instructions: string
  verificationError?: string
}

export type FullReport = {
  leaderId: string
  riskScoreBps: number
  degradationDetected: boolean
  action: string
  recommendedAllocationBps: number
  confidenceBps: number
  reasons: string[]
  reportHash: string
}

export type ReportFetchResult =
  | { status: "locked"; data: Report402Response }
  | { status: "unlocked"; data: FullReport }
  | { status: "error"; message: string }

export async function fetchReport(
  leaderId: string,
  txHash?: string,
  walletAddress?: string,
): Promise<ReportFetchResult> {
  try {
    const headers: Record<string, string> = {}
    if (txHash && walletAddress) {
      headers["X-Payment-Tx-Hash"] = txHash
      headers["X-Wallet-Address"] = walletAddress
    }

    const res = await fetch(`/api/reports/${leaderId}`, { headers })

    if (res.status === 402) {
      const data = (await res.json()) as Report402Response
      return { status: "locked", data }
    }

    if (res.ok) {
      const data = (await res.json()) as FullReport
      return { status: "unlocked", data }
    }

    return { status: "error", message: `Server error: ${res.status}` }
  } catch {
    return { status: "error", message: "Unable to connect to report service" }
  }
}
```

**关键**：
- 不使用 `fetchJson`（因为它对非 200 会 throw），需要自定义 fetch 处理 402
- 后端未运行时 fetch 会 throw → catch 返回 error 状态，UI 不崩溃
- 不传 headers → 一定收到 402（触发付款流程）
- 传了 headers → 后端验证成功则 200，失败则 402 + verificationError

## 6. components/report-paywall.tsx 设计

### 状态机

```
idle → fetching → locked → paying → confirming → verifying → unlocked
                  ↘ error                ↘ error              ↘ error
```

| 状态 | 显示 |
|---|---|
| `idle` | 初始状态，触发第一次 fetch |
| `fetching` | Loading spinner |
| `locked` | "Unlock Full Report — 1 USDC" 按钮 + 402 信息 |
| `paying` | "Confirm in wallet..." + pending |
| `confirming` | "Waiting for confirmation..." |
| `verifying` | "Verifying payment..." |
| `unlocked` | 完整 report 内容展示 |
| `error` | 错误消息 + 重试按钮 |

### 组件 Props

```typescript
interface ReportPaywallProps {
  leaderId: string
}
```

### 核心逻辑

```typescript
"use client"

import { useCallback, useEffect, useState } from "react"
import { useAppKitAccount } from "@reown/appkit/react"
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi"
import { parseUnits } from "viem"
import { REPORT_PAYMENT_ABI, REPORT_PAYMENT_ADDRESS, stringToBytes32 } from "@/lib/contracts"
import { arcTestnet } from "@/lib/arc"
import { fetchReport, type FullReport, type Report402Response } from "@/lib/api"

type PaywallState = "idle" | "fetching" | "locked" | "paying" | "confirming" | "verifying" | "unlocked" | "error"

export function ReportPaywall({ leaderId }: ReportPaywallProps) {
  const { address, isConnected } = useAppKitAccount()
  const [state, setState] = useState<PaywallState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [paywallData, setPaywallData] = useState<Report402Response | null>(null)
  const [report, setReport] = useState<FullReport | null>(null)

  const [paymentTxHash, setPaymentTxHash] = useState<`0x${string}` | undefined>()
  const { writeContractAsync } = useWriteContract()
  const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
    hash: paymentTxHash,
    chainId: arcTestnet.id,
  })

  const paymentKey = address
    ? `copyguard:report-payment:${address.toLowerCase()}:${leaderId}`
    : null

  // Step 1: Initial fetch to check payment status.
  // Use loadingState="verifying" after payment so UI does not jump back to generic fetching.
  const doFetch = useCallback(async (
    tx?: string,
    wallet?: string,
    loadingState: PaywallState = "fetching",
  ) => {
    setState(loadingState)
    setError(null)
    const result = await fetchReport(leaderId, tx, wallet)

    if (result.status === "unlocked") {
      setReport(result.data)
      if (tx && paymentKey) localStorage.setItem(paymentKey, tx)
      setState("unlocked")
      return
    }

    if (result.status === "locked") {
      setPaywallData(result.data)
      if (result.data.verificationError) {
        setError(result.data.verificationError)
        setState("error")
      } else {
        setState("locked")
      }
      return
    }

    setError(result.message)
    setState("error")
  }, [leaderId, paymentKey])

  // On mount, fetch report status.
  // If wallet is connected and a previous payment txHash is cached, verify it automatically.
  useEffect(() => {
    if (state !== "idle") return
    const savedTxHash = paymentKey ? localStorage.getItem(paymentKey) : null
    if (address && savedTxHash) {
      setPaymentTxHash(savedTxHash as `0x${string}`)
      void doFetch(savedTxHash, address, "verifying")
    } else {
      void doFetch()
    }
  }, [state, address, paymentKey, doFetch])

  // Step 2: Pay on chain. Use writeContractAsync so wallet errors and user rejection are caught.
  async function handlePay() {
    if (!isConnected || !address) {
      setError("Connect wallet to unlock")
      setState("error")
      return
    }

    setState("paying")
    setError(null)

    try {
      const hash = await writeContractAsync({
        address: REPORT_PAYMENT_ADDRESS,
        abi: REPORT_PAYMENT_ABI,
        functionName: "purchaseReport",
        args: [stringToBytes32(leaderId)],
        value: parseUnits("1", 18),
        chainId: arcTestnet.id,
      })
      setPaymentTxHash(hash)
      if (paymentKey) localStorage.setItem(paymentKey, hash)
      setState("confirming")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment cancelled or failed")
      setState("error")
    }
  }

  // Step 3: When tx confirmed, verify with backend using payment headers.
  useEffect(() => {
    if (state === "confirming" && isTxConfirmed && paymentTxHash && address) {
      void doFetch(paymentTxHash, address, "verifying")
    }
  }, [state, isTxConfirmed, paymentTxHash, address, doFetch])

  // Render based on state...
  // (完整 render 逻辑见下方 Codex prompt)
}
```

### UI 展示

**locked 状态**：
- 标题："Full Risk Report"
- 锁定图标 / "Locked" badge
- 价格：1 USDC
- "Unlock Report" 按钮（需要连接钱包）
- 未连接钱包时禁用按钮并提示 "Connect wallet to unlock"

**unlocked 状态** — 完整 report 展示：
| 字段 | 格式 |
|---|---|
| Risk Score | `riskScoreBps` bps + 颜色条（同 risk card 逻辑） |
| Action | badge（FOLLOW=green, REDUCE=yellow, EXIT=red） |
| Confidence | `confidenceBps` bps |
| Degradation | Detected / Not detected |
| Reasons | 列表展示每条 reason |
| Report Hash | 截断显示 + 完整可复制 |
| Payment Tx | 截断显示 + Arcscan 链接，使用 `txUrl(paymentTxHash)` |
| Recommended Allocation | `recommendedAllocationBps` bps |

**error 状态**：
- 错误消息
- "Retry" 按钮 → 回到 idle → 重新 fetch

### 额外修正与强约束

1. 付款调用必须优先使用 `writeContractAsync`，不要只依赖 `writeContract + try/catch`。用户拒签、钱包错误、链错误、合约 revert 都必须进入 `error` 状态并显示友好错误。
2. ReportPaywall 内部需要维护 `paymentTxHash` state。支付成功拿到 tx hash 后，进入 `confirming` 状态，并用该 hash 等待交易确认。
3. 当付款后调用 `fetchReport(leaderId, txHash, address)` 时：
   - 如果返回 `unlocked`，展示完整报告；
   - 如果返回 `locked` 且包含 `verificationError`，必须进入 `error` 状态并显示 `verificationError`；
   - 如果返回普通 `locked`，展示 paywall；
   - 如果返回 `error`，展示错误提示。
4. 为了刷新页面后仍能重新解锁，支付成功后把 txHash 存入 localStorage。key 格式建议：
   `copyguard:report-payment:${walletAddress.toLowerCase()}:${leaderId}`
5. ReportPaywall 初始化时：
   - 如果钱包未连接，只请求无 headers 的 report 状态，显示 locked/paywall；
   - 如果钱包已连接且 localStorage 中存在该 leader 的 txHash，则用该 txHash + walletAddress 自动请求 report；
   - 如果验证失败，显示 `verificationError`，并允许用户重新付款或清除后重试。
6. unlocked 状态除了展示 `reportHash`，还要展示 `paymentTxHash` 和 Arcscan 链接。使用 `txUrl(paymentTxHash)` 生成交易链接。
7. `doFetch()` 不要在 verifying 状态下强行改回 fetching。建议支持参数：`doFetch(txHash?, walletAddress?, loadingState = "fetching")`，付款后验证时使用 `loadingState = "verifying"`。
8. 未连接钱包时，Unlock 按钮应禁用或显示 “Connect wallet to unlock”，不要触发 `writeContractAsync`。
9. 付款失败、用户取消、后端未运行、验证失败都不能导致页面崩溃。

## 7. app/leaders/[id]/page.tsx 修改

替换现有的 report placeholder section：

```tsx
// 替换这部分：
// <section className="rounded-2xl border bg-card p-5">
//   <h2 className="text-xl font-semibold">Full report unlock coming soon</h2>
//   <p className="mt-2 text-sm text-muted-foreground">
//     x402 unlock flow will be implemented later...
//   </p>
// </section>

// 替换为：
<ReportPaywall leaderId={leader.id} />
```

**只修改这一个 section**，不改其他任何代码。MyBondCard 和 BondCreateModal 保持不变。

## 8. Codex 执行 Prompt

> 将以下内容完整粘贴给 Codex 执行。

---

你正在为 CopyGuard Bond 项目添加 x402 付费报告解锁功能。前端代码在 `apps/web/`。

### 当前状态

- Next.js 15 前端已搭建完成（Task 8A）
- MyBondCard 已实现（Task 10B）
- 后端 x402 端点已实现：`GET /api/reports/{leader_id}`
- `apps/web/app/leaders/[id]/page.tsx` 底部有 placeholder section 需要替换

### 后端 API（已实现，不修改）

`GET /api/reports/{leader_id}`（通过 next.config.js rewrite 代理到 localhost:8000）：

**无付款 headers** → 返回 402：
```json
{
  "status": 402,
  "message": "Payment required to unlock full risk report",
  "price": "1000000000000000000",
  "priceHuman": "1 USDC",
  "recipient": "0x15832FA84424E257ACf3735e905E9a5d3B33ee82",
  "resource": "report:hl_leader_03",
  "chainId": 5042002,
  "contractAddress": "0x15832FA84424E257ACf3735e905E9a5d3B33ee82",
  "instructions": "Call purchaseReport(leaderId) with msg.value = 1 USDC on Arc Testnet, then retry with X-Payment-Tx-Hash and X-Wallet-Address headers"
}
```

**带 `X-Payment-Tx-Hash` + `X-Wallet-Address` headers**：
- 验证失败 → 402 + 额外字段 `"verificationError": "具体错误"`
- 验证成功 → 200：
```json
{
  "leaderId": "hl_leader_03",
  "riskScoreBps": 7267,
  "degradationDetected": true,
  "action": "EXIT",
  "recommendedAllocationBps": 2733,
  "confidenceBps": 7500,
  "reasons": ["Drawdown acceleration exceeded safe threshold", "..."],
  "reportHash": "0xabc123..."
}
```

### 已部署合约（Arc Testnet chainId 5042002）

```
ReportPayment: 0x15832FA84424E257ACf3735e905E9a5d3B33ee82
```

### 已有前端资源（不修改，只引用）

- `apps/web/lib/contracts.ts`：
  - `REPORT_PAYMENT_ABI`（purchaseReport + hasPurchased）
  - `REPORT_PAYMENT_ADDRESS`
  - `stringToBytes32(str)`
- `apps/web/lib/arc.ts`：`arcTestnet` chainId, `txUrl(hash)`
- `apps/web/lib/api.ts`：现有 `fetchJson` 和 leader types（需要扩展）
- `apps/web/components/bond-create-modal.tsx`：`useWriteContract` 模式参考

### 修正版关键要求（必须遵守）

1. 付款提交使用 `writeContractAsync`，不要只依赖 `writeContract + try/catch`。
2. 组件内部维护 `paymentTxHash` state；交易 hash 用于等待确认、后端验证、UI 展示。
3. 支付成功后将 txHash 保存到 localStorage，key：`copyguard:report-payment:${walletAddress.toLowerCase()}:${leaderId}`。
4. 初始化时如果钱包已连接且 localStorage 有历史 txHash，自动带 headers 请求报告，刷新页面后仍能看到已解锁内容。
5. 付款后如果后端返回 402 + `verificationError`，必须显示为 error，不要当作普通 locked。
6. unlocked 状态必须展示完整报告、reportHash、paymentTxHash，并用 `txUrl(paymentTxHash)` 链接 Arcscan。
7. `doFetch()` 支持 `loadingState` 参数，付款后验证时保持 `verifying` 文案。
8. 用户拒签、钱包错误、链错误、合约 revert、后端未运行、验证失败都不能导致页面崩溃。

### 步骤

#### Step 1: 扩展 apps/web/lib/api.ts

在文件末尾添加 report 相关 types 和 fetcher：

**Types**：
- `Report402Response`：status, message, price, priceHuman, recipient, resource, chainId, contractAddress, instructions, verificationError?（可选）
- `FullReport`：leaderId, riskScoreBps, degradationDetected, action, recommendedAllocationBps, confidenceBps, reasons (string[]), reportHash
- `ReportFetchResult`：联合类型 `{status:"locked", data:Report402Response} | {status:"unlocked", data:FullReport} | {status:"error", message:string}`

**Fetcher**：`fetchReport(leaderId, txHash?, walletAddress?)` → `Promise<ReportFetchResult>`
- 构造 headers：如果 txHash 和 walletAddress 都有，添加 `X-Payment-Tx-Hash` 和 `X-Wallet-Address`
- fetch `/api/reports/${leaderId}`
- 402 → `{status:"locked", data: json}`
- 200 → `{status:"unlocked", data: json}`
- fetch 失败（网络错误、后端未运行）→ `{status:"error", message: "Unable to connect to report service"}`
- 其他非 200 → `{status:"error", message: "Server error: ${status}"}`

**不要修改** 文件中已有的 types 和 fetchJson。

#### Step 2: 创建 apps/web/components/report-paywall.tsx

创建 ReportPaywall 组件：

**Props**: `{ leaderId: string }`

**状态机**：idle → fetching → locked → paying → confirming → verifying → unlocked
                                                  ↘ error

**逻辑**：
1. `idle` → useEffect 触发 `doFetch()`（无 headers → 一定收 402）
2. `fetching` → 显示 loading
3. `locked` → 显示 "Unlock Full Report — 1 USDC" 按钮
4. 用户点击 → 使用 `writeContractAsync` 调用 `ReportPayment.purchaseReport(stringToBytes32(leaderId))`，value=`parseUnits("1", 18)`。
5. `writeContractAsync` 成功返回 txHash 后：保存到 `paymentTxHash` state 和 localStorage，然后进入 `confirming`。
6. `confirming` + `isTxConfirmed` → `doFetch(txHash, address, "verifying")`。
7. `verifying` → 后端返回 unlocked → 进入 `unlocked`，展示完整 report + payment txHash + Arcscan 链接。
8. 付款后如果后端返回 402 且包含 `verificationError`，必须进入 `error` 状态并显示具体错误。
9. 任何步骤出错 → 进入 `error`，显示错误消息 + "Retry" 按钮。

**UI**：

locked 状态：
- 标题 "Full Risk Report"
- 价格 "1 USDC"
- "Unlock Report" 按钮
- 未连接钱包时显示 "Connect wallet to unlock" 替代按钮

unlocked 状态 — 展示完整 report：
- Risk Score（数字 + 颜色：green<3000, yellow 3000-7000, red>7000）
- Action badge（FOLLOW/REDUCE/EXIT）
- Confidence
- Degradation Detected（是/否）
- Reasons 列表
- Report Hash（截断 + 可复制）
- Recommended Allocation

error 状态：
- 错误消息（红色文本）
- "Retry" 按钮 → setState("idle")

paying/confirming/verifying 状态：
- 显示当前步骤的文字提示
- "Confirm in wallet..." / "Waiting for confirmation..." / "Verifying payment..."

**使用**：
- `useAppKitAccount()` 获取 address, isConnected
- `useWriteContract()` 中的 `writeContractAsync` + `useWaitForTransactionReceipt()` 处理链上交易
- `fetchReport()` 处理 API 调用
- `REPORT_PAYMENT_ABI`, `REPORT_PAYMENT_ADDRESS`, `stringToBytes32` from contracts.ts
- `arcTestnet` from arc.ts
- `parseUnits` from viem
- `'use client'` directive

**安全**：
- fetch 失败（后端未运行）不崩溃，显示 "Unable to connect to report service"
- `writeContractAsync` 抛异常不崩溃，catch 并显示错误
- `verificationError` 必须显示在 error 状态中，不能静默回到普通 locked 状态

#### Step 3: 修改 apps/web/app/leaders/[id]/page.tsx

**只做以下修改**：

1. 在文件顶部添加 import：
   ```tsx
   import { ReportPaywall } from "@/components/report-paywall"
   ```

2. 替换 report placeholder section（文件底部，BondCreateModal 下方的 section）：
   ```tsx
   // 删除这部分：
   <section className="rounded-2xl border bg-card p-5">
     <h2 className="text-xl font-semibold">Full report unlock coming soon</h2>
     <p className="mt-2 text-sm text-muted-foreground">
       x402 unlock flow will be implemented later. This task only reserves the report area.
     </p>
   </section>

   // 替换为：
   <ReportPaywall leaderId={leader.id} />
   ```

**不改任何其他代码**。MyBondCard、BondCreateModal、RiskCard、WalletConnect 等全部保持不变。

### 强约束

- **不修改** `contracts/` 下的任何文件
- **不修改** `agents/` 下的任何文件
- **不修改** `apps/web/next.config.js`
- **不修改** `apps/web/lib/contracts.ts`
- **不修改** `apps/web/components/bond-create-modal.tsx`
- **不修改** `apps/web/components/my-bond-card.tsx`
- **不实现** refund/slash/settle
- **不实现** /events getLogs
- **不修改** MyBondCard 或 BondCreateModal 区域
- 后端未运行时 fetch 失败，UI 显示友好提示，不崩溃
- 用户拒签、钱包错误、链错误、合约 revert 必须显示友好错误
- 支付成功 txHash 必须保存到 localStorage，刷新后可自动重试解锁
- unlocked 状态必须显示 payment txHash + Arcscan 链接
- npm run build **必须通过**

### 验证

```bash
cd apps/web && npm run build
```

必须通过，无类型错误。

---

## 9. Task 10C 验收 Checklist

| # | 检查项 | 验证方式 |
|---|---|---|
| 1 | `npm run build` 通过 | `cd apps/web && npm run build` |
| 2 | `/leaders/[id]` 页面 ReportPaywall 替换了 placeholder | 读文件 / 浏览器验证 |
| 3 | 钱包未连接时显示 "Connect wallet to unlock" | 浏览器验证 |
| 4 | 钱包已连接时显示 "Unlock Full Report — 1 USDC" 按钮 | 浏览器验证 |
| 5 | 点击后用 writeContractAsync 调用 purchaseReport(leaderId) msg.value=1e18 | 读代码 / 浏览器验证 |
| 6 | 交易 pending 时显示 loading 状态 | 浏览器验证 |
| 7 | 交易确认后自动带 payment headers 重试 /api/reports/:id | 读代码 |
| 8 | 后端返回 200 时展示完整 report（riskScore, action, reasons, reportHash） | 浏览器验证 |
| 8.1 | unlocked 状态展示 paymentTxHash + Arcscan 链接 | 浏览器验证 |
| 8.2 | 支付 txHash 存入 localStorage，刷新后可自动验证/解锁 | 浏览器验证 / 读代码 |
| 9 | 后端返回 402 verificationError 时进入 error 状态并显示友好错误 | 浏览器验证 |
| 10 | 后端未运行时 UI 不崩溃 | 断开后端 + 浏览器验证 |
| 11 | `contracts/` git diff 为空 | `git diff contracts/` |
| 12 | `agents/` git diff 为空 | `git diff agents/` |
| 13 | `next.config.js` git diff 为空 | `git diff apps/web/next.config.js` |
| 14 | 不破坏 Task 8A（钱包连接、createBond）功能 | 浏览器验证 |
| 15 | 不破坏 Task 10B（MyBondCard）功能 | 浏览器验证 |
