# Task 9B Follow-up：首页正式产品化文案调整 — Codex 执行 Prompt

> 用途：交给 Codex 执行，对当前首页进行一次**轻量文案与定位调整**。
>
> 目标：保留现有首页结构和布局，只把页面从“明显 hackathon demo / MVP 展示页”的语气，调整为更像一个正式产品的 landing page。
>
> 注意：本任务不是重新实现 Task 9B，不是新增业务功能，不是修改链上逻辑。

---

## 1. 当前问题

当前首页整体结构已经可以，但页面里 `demo`、`MVP`、`judge`、`mock leaders`、`Start the demo` 等词过多，看起来更像临时演示页面，而不是一个正式项目。

需要保留技术诚实性：项目仍运行在 Arc Testnet，不要伪装成主网生产产品。

但视觉和文案上应更像：

- 正式产品首页
- 风险保护协议 / 风控产品 landing page
- Arc-native copy-trading risk protection layer

而不是：

- hackathon demo page
- judge walkthrough
- MVP checklist page

---

## 2. 允许修改

只允许修改：

```text
apps/web/app/page.tsx
```

---

## 3. 禁止修改

不要修改：

```text
contracts/
agents/
apps/web/lib/
apps/web/hooks/
apps/web/app/leaders/
apps/web/app/events/
apps/web/components/
apps/web/next.config.js
package.json
package-lock.json
docs/superpowers/progress.md
```

不要新增文件。

不要新增依赖。

不要修改业务逻辑。

---

## 4. 总体目标

保留当前首页已有的 5 个 section：

1. Hero
2. Flow
3. Live Proof / Capabilities
4. Architecture
5. Entry Points

但调整文案，使其更正式、更产品化。

核心原则：

- 少用 `demo`
- 少用 `MVP`
- 不出现 `judge`
- 不出现 `mock leaders`
- 不把项目说成 Arc 官方概念
- 不声称 mainnet / production ready
- 不声称保险或收益保障
- 保留 `Arc Testnet` 作为诚实说明
- 保留评审可快速进入核心路径的 CTA

---

## 5. 具体文案修改要求

### 5.1 顶部导航

当前：

```text
Demo Flow
```

建议改为：

```text
How It Works
```

或：

```text
Protection Flow
```

优先使用：

```text
How It Works
```

---

### 5.2 Hero 区域

当前 eyebrow：

```text
ARC TESTNET MVP
```

改为：

```text
ARC-NATIVE RISK PROTECTION
```

保留主标题：

```text
CopyGuard Bond
```

保留或微调 subtitle：

```text
Arc-native protection layer for copy-trading followers.
```

Hero 的功能点可以保留，但避免 demo 语气。

建议功能点：

```text
AI risk scoring with deterministic fallback
On-chain protection bond via Arc native USDC
x402-style report unlock
Arc Testnet activity tracking
```

注意：

- 可以保留 Arc Testnet
- 不要在 Hero 大标题区域写 MVP
- 不要写 production ready
- 不要写 mainnet

---

### 5.3 Wallet entry 卡片

当前类似：

```text
The demo can be reviewed without connecting a wallet.
Wallet connection is only needed for on-chain actions.
```

建议改为：

```text
Browse risk profiles without a wallet. Connect only when creating protection bonds or unlocking full reports.
```

要求：

- 不要让首页内容依赖钱包连接
- WalletConnect 作为辅助入口可以保留
- 首页仍应是 server component

---

### 5.4 Flow 区域

当前 section 可能是：

```text
DEMO FLOW
Walk the full MVP path
A judge can start from the leader list, create a bond, unlock a report, and verify events on Arc Testnet.
```

改为更正式：

Eyebrow：

```text
PROTECTION FLOW
```

标题：

```text
From risk review to on-chain protection
```

描述：

```text
Users can review leader risk, create protection bonds, unlock full reports, and verify activity on Arc Testnet.
```

---

### 5.5 Flow 卡片

保留 4 张卡片结构，但调整文案。

#### Card 1

标题保留：

```text
Review Leaders
```

当前可能有：

```text
Browse 5 mock leaders with live risk scores on /leaders.
```

改为：

```text
Review curated copy-trading leader profiles with deterministic risk scoring.
```

注意：

- 不要写 mock leaders
- 不要写 live risk scores，除非这里真的实时读取

#### Card 2

标题：

```text
Create Bond
```

建议描述：

```text
Connect wallet, select a leader, and create a protection bond with Arc native USDC.
```

#### Card 3

标题：

```text
Unlock Report
```

建议描述：

```text
Pay 1 USDC on-chain through an x402-style flow to unlock the full AI risk report.
```

#### Card 4

标题：

```text
Track Events
```

建议描述：

```text
Review Arc Testnet activity such as BondCreated, ReportPurchased, and RiskUpdated on the events page.
```

注意：

- 如果页面不是严格实时，不要写 real-time
- 可以写 activity tracking / event stream / events page

---

### 5.6 Live Proof 区域

当前可能是：

```text
LIVE PROOF
What works today
The current demo includes deployed contracts, on-chain actions, paid report verification, and real event reads.
```

建议改为：

Eyebrow：

```text
ON-CHAIN CAPABILITIES
```

标题：

```text
Operational on Arc Testnet
```

描述：

```text
CopyGuard Bond combines deployed contracts, on-chain payments, report verification, and event reads.
```

能力卡片可保留，但调整措辞：

当前类似：

```text
5 mock leaders with deterministic risk scoring
Arc Testnet contracts deployed
CopyGuardBondVault createBond confirmed on-chain
MyBondCard reads user bond state via multicall
x402-style full report unlock with on-chain payment proof
Events page reads real getLogs from Arc RPC
```

建议改为：

```text
Curated leader profiles with deterministic risk scoring
Arc Testnet contracts deployed
Protection bond creation confirmed on-chain
User bond state read through multicall
x402-style report unlock with on-chain payment proof
Event stream reads getLogs from Arc RPC
```

---

### 5.7 Architecture 区域

当前：

```text
Why this demo fits Arc
```

建议改为：

```text
Why Arc
```

或保留：

```text
Why this flow fits Arc
```

优先使用：

```text
Why Arc
```

描述建议：

```text
The flow uses native payments, public verification, deterministic scoring, and HTTP 402-style access control.
```

卡片可以保留：

```text
Native USDC flow
Verifiable on Arcscan
AI + deterministic fallback
x402-style paid access
```

但注意：

- 不要写官方 Arc risk bond
- 不要写 insurance
- 不要写 guaranteed protection

---

### 5.8 Entry Points 区域

当前可能是：

```text
ENTRY POINTS
Start the demo
Use these routes to quickly verify the core flow.
```

改为：

Eyebrow 可以保留：

```text
ENTRY POINTS
```

标题改为：

```text
Explore CopyGuard Bond
```

描述改为：

```text
Start from leader risk profiles, inspect bond protection, or review on-chain activity.
```

入口卡片：

#### `/leaders`

当前：

```text
Browse leaders and risk scores
```

可保留，或改为：

```text
Browse leader risk profiles
```

#### `/leaders/hl_leader_03`

当前：

```text
Try the full demo flow with "Reckless Raj"
```

改为：

```text
Open a high-risk leader profile
```

#### `/events`

当前：

```text
Watch on-chain events in real time
```

建议改为：

```text
Review on-chain activity
```

如果页面确实 10 秒轮询，可以写：

```text
Review the Arc Testnet event stream
```

---

## 6. 明确禁止出现的词/表达

不要在首页新增或保留这些表达：

```text
judge
mock leaders
demo flow
full MVP path
production ready
mainnet
insurance
guaranteed protection
official Arc risk bond
real exchange integration
automatic slashing/refund is live
```

`demo` 一词尽量不要出现在页面可见文案中。  
如果确实必须保留，也只能出现在很低优先级说明里，不要出现在 section 标题或 CTA 中。

`MVP` 不要出现在 Hero eyebrow 或核心标题里。

---

## 7. 可以使用的表达

可以使用：

```text
protection bond
Arc Testnet
Arc-native
copy-trading risk protection
on-chain payment verification
x402-style report unlock
deterministic risk scoring
on-chain activity
event stream
risk profiles
full risk report
```

---

## 8. 技术约束

必须保持：

- `apps/web/app/page.tsx` 是 server component
- 不添加 `"use client"`
- 不调用 API
- 不调用 `fetch`
- 不使用 wagmi hooks
- 不使用 viem
- 不读取 localStorage
- 不读取 wallet state
- 不修改链接路径
- 不使用 `Button asChild`
- 不新增依赖
- 不新增 env
- 不新增组件
- 不修改 progress.md

如果当前页面已经引入 WalletConnect，可以保留；但不要新增钱包相关业务逻辑。

---

## 9. 验证命令

修改完成后运行：

```bash
cd apps/web && npm run build
```

允许已有 Reown/Wagmi warning，只要 build 不失败。

---

## 10. git diff 检查

在项目根目录运行：

```bash
git diff --stat
git diff --stat contracts
git diff --stat agents
git diff --stat apps/web/lib
git diff --stat apps/web/hooks
git diff --stat apps/web/app/leaders
git diff --stat apps/web/app/events
git diff --stat apps/web/components
git diff --stat apps/web/next.config.js
git diff --stat package.json package-lock.json
git diff --stat docs/superpowers/progress.md
```

预期：

- 只有 `apps/web/app/page.tsx` 有本次变更
- 禁止修改范围无输出
- `docs/superpowers/progress.md` 不应被本次修改

注意：如果工作区已有之前任务遗留 diff，需要在输出中说明哪些不是本次 Task 9B follow-up 产生的。

---

## 11. Codex 输出要求

完成后请输出：

1. 修改了哪些文件
2. 哪些可见文案从 demo/MVP 语气调整为正式产品语气
3. 是否仍保留 Arc Testnet 的诚实说明
4. 是否运行 `cd apps/web && npm run build`
5. build 是否通过
6. 是否确认未修改禁止文件
7. 是否确认没有修改 `docs/superpowers/progress.md`

---

## 12. 验收标准

本次 follow-up 通过条件：

1. 首页整体看起来像正式产品 landing page
2. 首屏不再出现 `ARC TESTNET MVP`
3. 主要 section 标题不再出现 `Demo Flow`
4. 不出现 `judge`
5. 不出现 `mock leaders`
6. 不出现 `full MVP path`
7. 不夸大为 mainnet / production ready
8. 不把 protection bond 说成 Arc 官方概念
9. CTA 链接保持可用：
   - `/leaders`
   - `/leaders/hl_leader_03`
   - `/events`
10. build 通过
11. 只修改 `apps/web/app/page.tsx`
