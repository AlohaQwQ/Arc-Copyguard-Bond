# Task 9B: Home Page Demo Polish — Codex 执行 Prompt

> **范围**：将首页 `/` 从基础入口页打磨成评审友好的 demo landing page。不新增业务功能，不新增链上交互，不修改其他页面。

## 1. 目标

让评审在 10 秒内理解：
1. CopyGuard Bond 是什么
2. 它解决什么问题
3. 当前 demo 已完成哪些 Arc Testnet 链上能力
4. 评审应该如何走完整 demo flow
5. 从首页能快速进入 `/leaders`、`/leaders/hl_leader_03`、`/events`

## 2. 当前状态

- Next.js 15 前端已完成（Task 8A）
- MyBondCard 已实现（Task 10B）
- ReportPaywall + x402 unlock 已实现（Task 10C）
- Events Page 真实 getLogs 已实现（Task 11）
- 当前 `apps/web/app/page.tsx` 是基础首页，需要打磨为 demo landing page

## 3. 允许修改的文件

| 操作 | 文件 | 说明 |
|---|---|---|
| 修改 | `apps/web/app/page.tsx` | 主要修改文件 |
| 可选新增 | `apps/web/components/home-demo-section.tsx` | 如需拆分 section |
| 可选新增 | `apps/web/components/home-status-card.tsx` | 如需拆分 status card |

**优先只改 page.tsx**。只有文件过长时才拆组件。

## 4. 禁止修改的文件

- `contracts/`
- `agents/`
- `apps/web/lib/contracts.ts`
- `apps/web/lib/api.ts`
- `apps/web/lib/wagmi.ts`
- `apps/web/lib/arc.ts`
- `apps/web/app/providers.tsx`
- `apps/web/app/leaders/`
- `apps/web/app/events/`
- `apps/web/hooks/`
- `apps/web/components/wallet-connect.tsx`
- `apps/web/components/bond-create-modal.tsx`
- `apps/web/components/my-bond-card.tsx`
- `apps/web/components/report-paywall.tsx`
- `apps/web/components/event-feed.tsx`
- `apps/web/next.config.js`
- `package.json`
- `package-lock.json`
- `docs/superpowers/progress.md`

## 5. 页面内容结构

### Section 1: Hero

- `ARC TESTNET MVP` 标签
- `CopyGuard Bond` 标题
- `Arc-native protection layer for copy-trading followers.` 副标题
- 简短功能列表：
  - AI risk scoring with deterministic fallback
  - On-chain protection bond via Arc native USDC
  - x402-style report unlock
  - Arc Testnet event tracking
- CTA 按钮（使用 Next.js `Link`，**不使用** `Button asChild`）：
  - View Leaders → `/leaders`
  - Try Risk Demo → `/leaders/hl_leader_03`
  - View Events → `/events`
- WalletConnect 组件保留

### Section 2: Demo Flow

4 步流程展示：

1. **Review Leaders** — Browse 5 mock leaders with live risk scores on `/leaders`
2. **Create Bond** — Connect wallet, select a leader, create a protection bond with Arc native USDC
3. **Unlock Report** — Pay 1 USDC on-chain via x402-style flow to unlock the full AI risk report
4. **Track Events** — Watch real on-chain events (BondCreated, ReportPurchased, RiskUpdated) on `/events`

每步包含简短描述。可以用数字标记 + 标题 + 描述的卡片布局。

### Section 3: Live Proof / What Works

展示当前已完成的链上能力：

- 5 mock leaders with deterministic risk scoring
- Arc Testnet contracts deployed (chainId 5042002)
- CopyGuardBondVault createBond confirmed on-chain
- MyBondCard reads user bond state via multicall
- x402-style full report unlock with on-chain payment proof
- Events page reads real getLogs from Arc RPC

可以用 checkmark + 简短描述的列表形式。

### Section 4: Architecture / Why Arc

解释技术选型：

- **Native USDC flow** — All payments (bonds, reports) use Arc native msg.value, no ERC-20 approvals
- **Verifiable on Arcscan** — Every transaction is publicly auditable on testnet.arcscan.app
- **AI + deterministic fallback** — Risk scoring works with or without LLM, same score for same input
- **x402-style paid access** — HTTP 402 negotiation with on-chain payment verification

### Section 5: Demo Entry Points

三个入口链接：

- `/leaders` — Browse leaders and risk scores
- `/leaders/hl_leader_03` — Try the full demo flow with "Reckless Raj"
- `/events` — Watch on-chain events in real-time

## 6. 文案准确性

**不要写**：
- insurance / guaranteed protection
- mainnet / production ready
- official Arc risk bond
- real exchange integration
- automatic slashing/refund is live

**可以写**：
- protection bond
- Arc Testnet MVP / demo
- x402-style payment unlock
- on-chain demo flow
- AI risk scoring with deterministic fallback

**关键**：不要把 "链上风险保护 bond" 描述成 Arc 官方概念，只能描述为本项目基于 Arc Testnet 实现的 demo 机制。

## 7. 技术约束

- 首页保持 **server component**（不加 `"use client"`）
- 不调用 API（不 fetch）
- 不调用 wagmi hooks / viem
- 不读取 localStorage / wallet state / 链上数据
- 不新增依赖 / env / API route
- 不使用 `Button asChild`（用 `<Link>` 替代）
- 使用 Tailwind + shadcn/ui 已有组件
- 使用 Next.js `Link` 做页面跳转
- WalletConnect 组件可以保留在 Hero section（它是 client component，但 page 本身保持 server component）
- 移动端布局不崩坏（responsive grid）

## 8. Codex 执行 Prompt

> 将以下内容完整粘贴给 Codex 执行。

---

你正在为 CopyGuard Bond 项目打磨首页为 demo landing page。前端代码在 `apps/web/`。

### 当前状态

- Next.js 15 前端已完成，所有业务功能已实现
- `apps/web/app/page.tsx` 当前是基础首页，需要打磨为评审友好的 demo landing page
- 所有其他页面（leaders、events）已实现且验收通过

### 步骤

#### Step 1: 重写 apps/web/app/page.tsx

将当前基础首页重写为 demo landing page，包含以下 5 个 section：

**Section 1: Hero**
- `ARC TESTNET MVP` 小标签
- `CopyGuard Bond` 大标题
- `Arc-native protection layer for copy-trading followers.` 副标题
- 功能亮点列表：AI risk scoring, on-chain protection bond, x402-style report unlock, Arc Testnet event tracking
- CTA 链接（使用 Next.js `<Link>`，**不要**用 `Button asChild`）：
  - View Leaders → `/leaders`
  - Try Risk Demo → `/leaders/hl_leader_03`
  - View Events → `/events`
- 保留 `<WalletConnect />` 组件

**Section 2: Demo Flow**
- 4 步流程：
  1. Review Leaders — Browse 5 mock leaders with live risk scores on /leaders
  2. Create Bond — Connect wallet, select a leader, create a protection bond with Arc native USDC
  3. Unlock Report — Pay 1 USDC on-chain via x402-style flow to unlock the full AI risk report
  4. Track Events — Watch real on-chain events (BondCreated, ReportPurchased, RiskUpdated) on /events
- 每步用数字 + 标题 + 简短描述

**Section 3: Live Proof / What Works**
- 已完成能力列表（checkmark + 描述）：
  - 5 mock leaders with deterministic risk scoring
  - Arc Testnet contracts deployed (chainId 5042002)
  - CopyGuardBondVault createBond confirmed on-chain
  - MyBondCard reads user bond state via multicall
  - x402-style full report unlock with on-chain payment proof
  - Events page reads real getLogs from Arc RPC

**Section 4: Architecture / Why Arc**
- 技术选型说明：
  - Native USDC flow — All payments use Arc native msg.value, no ERC-20 approvals
  - Verifiable on Arcscan — Every transaction publicly auditable on testnet.arcscan.app
  - AI + deterministic fallback — Risk scoring works with or without LLM
  - x402-style paid access — HTTP 402 negotiation with on-chain payment verification

**Section 5: Demo Entry Points**
- 三个入口链接（使用 Next.js `<Link>`）：
  - `/leaders` — Browse leaders and risk scores
  - `/leaders/hl_leader_03` — Try the full demo flow with "Reckless Raj"
  - `/events` — Watch on-chain events in real-time

### 技术约束

- **保持 server component**（不加 `"use client"`）
- **不调用** API / fetch / wagmi / viem / localStorage / wallet state / 链上数据
- **不新增** 依赖 / env / API route
- **不使用** `Button asChild`（用 `<Link>` + Tailwind 样式替代）
- 使用 Tailwind + shadcn/ui 已有组件
- WalletConnect 可以保留在 Hero section（它是独立 client component）
- 移动端 responsive

### 文案约束

- 明确标注 Arc Testnet MVP / demo
- 不要写 insurance / guaranteed protection / mainnet / production ready
- 不要把 protection bond 描述成 Arc 官方概念
- 只描述为本项目基于 Arc Testnet 实现的 demo 机制

### 禁止修改

- **不修改** `contracts/`
- **不修改** `agents/`
- **不修改** `apps/web/next.config.js`
- **不修改** `apps/web/app/leaders/`
- **不修改** `apps/web/app/events/`
- **不修改** `apps/web/components/wallet-connect.tsx`
- **不修改** `apps/web/components/bond-create-modal.tsx`
- **不修改** `apps/web/components/my-bond-card.tsx`
- **不修改** `apps/web/components/report-paywall.tsx`
- **不修改** `apps/web/components/event-feed.tsx`
- **不修改** `apps/web/hooks/`
- **不修改** `apps/web/lib/`
- **不修改** `package.json` / `package-lock.json`

### 验证

```bash
cd apps/web && npm run build
```

必须通过。

```bash
git diff --stat contracts
git diff --stat agents
git diff --stat apps/web/next.config.js
git diff --stat apps/web/app/leaders
git diff --stat apps/web/app/events
git diff --stat apps/web/components/bond-create-modal.tsx
git diff --stat apps/web/components/my-bond-card.tsx
git diff --stat apps/web/components/report-paywall.tsx
git diff --stat apps/web/components/event-feed.tsx
git diff --stat package.json package-lock.json
```

以上命令必须无输出。

---

## 9. Task 9B 验收 Checklist

| # | 检查项 | 验证方式 |
|---|---|---|
| 1 | `npm run build` 通过 | `cd apps/web && npm run build` |
| 2 | `/` 首页可打开 | 运行时验证 |
| 3 | Hero 有 ARC TESTNET MVP + CopyGuard Bond + 副标题 | 读文件 |
| 4 | CTA 到 `/leaders` | 读文件 |
| 5 | CTA 到 `/leaders/hl_leader_03` | 读文件 |
| 6 | CTA 到 `/events` | 读文件 |
| 7 | Demo Flow 4 步存在 | 读文件 |
| 8 | Live Proof / What Works 存在 | 读文件 |
| 9 | Architecture / Why Arc 存在 | 读文件 |
| 10 | Demo Entry Points 存在 | 读文件 |
| 11 | 首页不调用 API | 读文件，无 fetch/import api |
| 12 | 首页不读链 | 读文件，无 wagmi/viem import |
| 13 | 首页不要求钱包连接 | WalletConnect 保留但不阻塞内容 |
| 14 | 不使用 Button asChild | 读文件 |
| 15 | 无新增 "use client"（page 本身保持 server component） | 读文件 |
| 16 | 移动端布局不崩坏 | 读文件，responsive grid |
| 17 | 不修改 contracts/ | `git diff contracts/` |
| 18 | 不修改 agents/ | `git diff agents/` |
| 19 | 不修改 next.config.js | `git diff` |
| 20 | 不修改 leaders/ 页面 | `git diff apps/web/app/leaders/` |
| 21 | 不修改 events/ 页面 | `git diff apps/web/app/events/` |
| 22 | 不修改 Task 8A/10B/10C/11 组件 | `git diff` 检查 |
| 23 | 不修改 package.json/package-lock.json | `git diff` |
| 24 | `/leaders` 仍可打开 | build 输出确认 |
| 25 | `/leaders/hl_leader_03` 仍可打开 | build 输出确认 |
| 26 | `/events` 仍可打开 | build 输出确认 |
| 27 | 文案明确 Arc Testnet MVP | 读文件 |
| 28 | 文案没有把 protection bond 说成 Arc 官方概念 | 读文件 |
| 29 | progress.md 未被 Codex 修改 | `git diff docs/superpowers/progress.md` |
| 30 | npm run build 无 TypeScript 错误 | build 输出确认 |
