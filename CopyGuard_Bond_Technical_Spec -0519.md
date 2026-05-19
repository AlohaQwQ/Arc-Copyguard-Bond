# CopyGuard Bond 技术文档 v0.1

**项目定位：Arc-native social trading protection layer**  
**目标黑客松：Agora Agents Hackathon / Canteen × Circle**  
**推荐实现周期：7 天 MVP**  
**推荐开发方式：Claude Code / Codex + Superpowers workflow**

\---

## 0\. 文档使用说明

本文档完成 Agora Agents Hackathon 项目 **CopyGuard Bond** 的编码实现。

核心目标不是做一个普通 copy-trading dashboard，而是做一个 **Arc 原生的社交交易保护协议**：

> AI agent 监控 copy-trading leader 是否出现策略退化；follower 在 Arc 上为某个 leader 创建 USDC performance bond；当 AI/oracle 检测到风险恶化时，bond 进入 `SAFE / WARN / SLASHED / REFUNDED / SETTLED` 状态，并在 Arc 上留下可验证的结算记录。

\---

## 1\. 官方事实依据

### 1.1 Agora 黑客松方向

Agora 官方主题是：构建能够 **trade、invest、create、interface with markets** 的 AI agents，并使用 **Arc + USDC** 进行结算。

官方评分标准：

|评分项|权重|说明|
|-|-:|-|
|Agentic Sophistication|30%|AI 是否真正做决策，而不是普通自动化|
|Traction|30%|真实用户、真实交易、真实 volume|
|Circle Tool Usage|20%|是否创造性、有效使用 Circle / Arc 工具|
|Innovation|20%|是否是新方向、新行为、新研究 insight|

官方 RFB 06「Social Trading Intelligence」的问题定义是：copy trading 很流行，但大多数 follower 盲目复制 leader，不能理解风险，也不能检测策略退化。AI 应该决定：

* 跟随哪些 trader；
* 给每个 trader 分配多少资金；
* 什么时候停止跟随；
* 如何构建多信号组合；
* 如何过滤噪音。

官方 Research #06 还提出了 **Slash-bonded leaderboard copy-trading**：为某个 whale 在 Arc 上创建 USDC performance bond，如果 leaderboard rank 跌破阈值，bond 按比例 slash。官方强调，Arc 便宜费用让 retail follower size 下的 bond 也可行。

官方页面：`https://agora.thecanteenapp.com/`

\---

### 1.2 Arc 官方能力

Arc 官方文档说明，Arc 是面向 stablecoin-native financial applications 的 L1，具备：

* **USDC as gas**；
* **sub-second deterministic finality**；
* **full EVM compatibility**；
* 支持 payments、lending、FX、treasury management、agentic commerce；
* 开发者可使用 Solidity、Hardhat、Foundry、Viem 等标准 EVM 工具。

Arc 官方文档：`https://docs.arc.io/arc-chain`

Arc Build 文档说明，Arc 提供 App Kit，可用于跨链 payment / liquidity workflows，包括：

* Send；
* Bridge；
* Swap；
* Unified Balance；
* 合约部署；
* 合约交互；
* 事件监听；
* AI agent 注册；
* ERC-8183 job 创建。

Arc Build 文档：`https://docs.arc.io/build`

Arc Agentic Economy 文档说明，Arc 支持 AI agents 作为经济参与者，提供：

* ERC-8004 onchain identity / reputation；
* ERC-8183 job lifecycle；
* job creation；
* escrow funding；
* deliverable submission；
* evaluation；
* USDC settlement。

Arc Agentic Economy 文档：`https://docs.arc.io/build/agentic-economy`

\---

### 1.3 x402 官方能力

Circle 文档说明，x402 是基于 HTTP `402 Payment Required` 的开放支付协商标准，用于声明资源需要付款，并让客户端提供付款证明。

需要注意：x402 本身不是支付系统，而是一个 negotiation protocol；付款的构造、验证和结算由具体 payment method 或 facilitator 完成。

Circle x402 文档：`https://developers.circle.com/gateway/nanopayments/concepts/x402`

\---

## 2\. 项目目标

### 2.1 一句话定位

**CopyGuard Bond protects copy-traders from leader decay: AI monitors strategy degradation, followers create USDC-denominated protection bonds on Arc, and risk events settle instantly onchain.**

### 2.2 项目不是做什么

不要做：

* 真实自动跟单系统；
* 真实资金托管系统；
* 完整交易执行机器人；
* 复杂清算协议；
* 只有风险评分的静态 dashboard。

### 2.3 项目必须做什么

必须做：

* AI 检测 leader strategy degradation；
* follower 创建 Arc 上的 USDC-denominated performance bond；
* 风险报告通过 x402-style 付费解锁；
* bond 状态根据 AI/oracle 风险更新变化；
* 所有核心事件写入 Arc；
* 前端展示 Arc transaction / report hash / bond state / AI rationale。

\---

## 3\. 核心用户流程

```txt
1. 用户连接 Arc Testnet 钱包
2. 用户查看 leaderboard trader / whale 列表
3. AI agent 为每个 leader 输出 risk score、degradation status、recommended allocation
4. 用户支付 x402 / USDC 解锁完整风险报告
5. 用户为某个 leader 创建 USDC performance bond
6. AI / oracle 提交新的 risk update
7. bond 根据阈值进入 SAFE / WARN / SLASHED / REFUNDED / SETTLED
8. dashboard 展示 follower 是否应该 FOLLOW / REDUCE / EXIT
```

\---

## 4\. 技术栈要求

## 4.1 前端技术栈

|模块|推荐技术|
|-|-|
|Framework|Next.js 15 / App Router|
|Language|TypeScript|
|UI|Tailwind CSS + shadcn/ui 或 Radix UI|
|Web3|wagmi + viem|
|Wallet|Reown AppKit / RainbowKit / ConnectKit 三选一|
|Charts|Recharts|
|State/Data|TanStack Query|
|Forms|React Hook Form + Zod|
|Deploy|Vercel|

### 前端必须包含

* Arc Testnet wallet connect；
* leader list；
* leader detail；
* risk score card；
* bond creation modal；
* x402 paid report unlock；
* on-chain event feed；
* demo traction dashboard。

\---

## 4.2 后端技术栈

建议使用 **Next.js API routes + Python agent worker** 的混合架构。

|模块|推荐技术|
|-|-|
|API server|Next.js Route Handlers|
|AI worker|Python FastAPI / CLI worker|
|Data cache|Supabase Postgres 或 SQLite + Prisma|
|Background jobs|Inngest / BullMQ / cron|
|AI model|Claude / OpenAI / Gemini，必须输出 JSON schema|
|Market / Leader data|Hyperliquid public API / mock snapshots|
|Chain listener|viem `watchContractEvent` 或 server-side polling|
|Test|Vitest + Foundry + Playwright|

\---

## 4.3 智能合约技术栈

|模块|推荐技术|
|-|-|
|Solidity|`^0.8.24`|
|Framework|Foundry|
|Libraries|OpenZeppelin|
|Network|Arc Testnet|
|Gas|USDC as native gas|
|Explorer|Arcscan Testnet|

\---

## 5\. Arc / Circle 组件使用要求

## 5.1 P0 必须使用

|组件|用法|优先级|
|-|-|-:|
|Arc Testnet|所有合约部署在 Arc Testnet|P0|
|USDC as gas|钱包在 Arc 上用 USDC 支付交易 gas|P0|
|USDC bond|follower 创建 performance bond，合约以 USDC 计价|P0|
|x402 paid API|风险报告 `/api/reports/:leaderId` 通过 402 payment flow 解锁|P0|
|Event monitor|监听 `BondCreated / RiskUpdated / BondWarned / BondSettled`|P0|

## 5.2 P1 强烈建议使用

|组件|用法|优先级|
|-|-|-:|
|App Kit Send|用户向 agent / vault 发送 USDC 或支付 report fee|P1|
|ERC-8004-compatible agent identity|注册 CopyGuard Risk Agent，记录 reputation|P1|
|ERC-8183-compatible job settlement|follower 发起“评估某 leader”任务，USDC escrow 支付 agent|P1|
|Report hash / IPFS|风险报告 hash 上链，可选完整报告 pin 到 IPFS|P1|

## 5.3 P2 时间充足再做

|组件|用法|优先级|
|-|-|-:|
|Unified Balance|用户从多链 USDC 余额支付 report fee / bond|P2|
|Bridge / CCTP|用户从其他链桥入 USDC 到 Arc|P2|
|多 agent ensemble|Risk agent + Critic agent + Oracle agent|P2|

\---

## 6\. 系统架构

```txt
User / Follower
  ↓
Next.js Frontend
  ├─ Wallet Connect: Arc Testnet
  ├─ Leader Dashboard
  ├─ Risk Report Paywall via x402
  ├─ Create Bond Modal
  └─ Bond Event Feed
  ↓
API Layer
  ├─ /api/leaders
  ├─ /api/risk/:leaderId
  ├─ /api/reports/:leaderId  ← x402 protected
  ├─ /api/oracle/submit-risk
  └─ /api/events
  ↓
AI Risk Agent Worker
  ├─ Fetch leader metrics
  ├─ Detect strategy degradation
  ├─ Generate allocation recommendation
  ├─ Produce signed JSON risk report
  └─ Submit report hash to Arc
  ↓
Arc Smart Contracts
  ├─ CopyGuardBondVault.sol
  ├─ LeaderRegistry.sol
  ├─ RiskOracleAdapter.sol
  └─ AgentReputation.sol / ERC-8004-compatible
  ↓
Arc Testnet
  ├─ USDC gas
  ├─ USDC-denominated bonds
  ├─ Risk events
  └─ Settlement history
```

\---

## 7\. 核心合约设计

## 7.1 CopyGuardBondVault.sol

核心职责：创建 follower protection bond、接收 risk update、根据阈值触发 warn / slash / refund / settle。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

enum BondState {
    Active,
    Warned,
    Slashed,
    Refunded,
    Settled
}

struct Bond {
    uint256 id;
    address follower;
    bytes32 leaderId;
    uint256 amount;
    uint256 createdAt;
    uint256 expiry;
    uint16 riskThresholdBps;
    uint16 lastRiskScoreBps;
    bytes32 lastReportHash;
    BondState state;
}
```

### 必须函数

```solidity
function createBond(
    bytes32 leaderId,
    uint256 amount,
    uint16 riskThresholdBps,
    uint256 expiry
) external returns (uint256 bondId);

function submitRiskUpdate(
    uint256 bondId,
    uint16 riskScoreBps,
    bytes32 reportHash
) external;

function triggerWarning(uint256 bondId) external;

function settleBond(uint256 bondId) external;

function refundBond(uint256 bondId) external;

function slashBond(uint256 bondId, uint16 slashBps) external;
```

### 必须事件

```solidity
event BondCreated(
    uint256 indexed bondId,
    address indexed follower,
    bytes32 indexed leaderId,
    uint256 amount
);

event RiskUpdated(
    uint256 indexed bondId,
    uint16 riskScoreBps,
    bytes32 reportHash
);

event BondWarned(uint256 indexed bondId, uint16 riskScoreBps);

event BondSlashed(uint256 indexed bondId, uint256 slashedAmount);

event BondRefunded(uint256 indexed bondId, uint256 amount);

event BondSettled(uint256 indexed bondId);
```

\---

## 7.2 LeaderRegistry.sol

核心职责：注册 leader / whale / trader，并存储基础 metadata hash。

```solidity
struct Leader {
    bytes32 id;
    string venue;        // "Hyperliquid"
    address wallet;
    bytes32 metadataHash;
    bool active;
}
```

\---

## 7.3 RiskOracleAdapter.sol

核心职责：限制谁可以提交 risk update。MVP 阶段可以是 owner-controlled oracle；P1 再加入多 agent / multisig / reputation。

\---

## 7.4 AgentReputation.sol

P1 功能。记录 CopyGuard agent 的历史准确度、risk report 数量、被用户采纳次数、false warning 次数。

\---

## 8\. x402 支付设计

## 8.1 目标

`/api/reports/:leaderId` 是付费 API。

免费用户只能看到：

* risk score；
* action；
* confidence；
* 1 条摘要原因。

付费后用户可以看到：

* 完整 degradation report；
* 特征权重；
* 历史曲线；
* AI rationale；
* report hash；
* oracle signature；
* Arc transaction proof。

## 8.2 推荐 flow

```txt
1. 前端请求完整报告
2. 后端返回 402 Payment Required
3. 响应里包含 price、network、token、recipient、resource id
4. 客户端构造并签名 payment payload
5. 客户端带 PAYMENT-SIGNATURE 重试
6. 后端验证付款或通过 facilitator 验证
7. 返回完整报告和 PAYMENT-RESPONSE
```

## 8.3 MVP fallback

如果无法及时完成完整 Nanopayments facilitator 集成，则采用：

* API 仍使用 x402-style 402 negotiation；
* 付款证明使用 Arc 上的 `ReportPurchased` 合约事件；
* server 验证用户地址是否已经支付；
* README 明确写：

```txt
MVP uses x402-compatible HTTP negotiation with Arc USDC onchain proof.
Nanopayments / Gateway mode is P1.
```

这样避免虚假声称，同时保留 x402-style pay-per-report API + Arc USDC settlement 的核心设计。

\---

## 9\. AI Risk Agent 设计

## 9.1 输入 JSON

```json
{
  "leaderId": "hl\_0xabc...",
  "venue": "Hyperliquid",
  "lookbackDays": 30,
  "metrics": {
    "pnl7d": 0.12,
    "pnl30d": 0.41,
    "maxDrawdown7d": 0.18,
    "maxDrawdown30d": 0.22,
    "winRate7d": 0.46,
    "winRate30d": 0.58,
    "avgLeverage": 8.2,
    "positionConcentration": 0.72,
    "tradeFrequencyChange": 1.9
  }
}
```

## 9.2 输出 JSON

```json
{
  "leaderId": "hl\_0xabc...",
  "action": "REDUCE",
  "riskScoreBps": 7800,
  "degradationDetected": true,
  "recommendedAllocationBps": 500,
  "confidenceBps": 8200,
  "reasons": \[
    "7d win rate dropped below 30d baseline",
    "drawdown accelerated faster than historical volatility",
    "position concentration increased above safe threshold"
  ],
  "bondAction": "WARN",
  "reportHash": "0x..."
}
```

## 9.3 风险评分公式

MVP 不要完全依赖 LLM。建议使用：**规则评分 + LLM 解释**。

```txt
riskScore =
  25% drawdown acceleration
+ 20% win-rate decay
+ 20% leverage regime shift
+ 15% position concentration
+ 10% trade frequency anomaly
+ 10% volatility-adjusted PnL decay
```

LLM 只负责：

* 总结；
* 解释；
* 给出 action；
* 生成用户可读报告；
* 输出严格 JSON。

这能减少 AI 幻觉对链上状态的影响。

\---

## 10\. 数据源策略

## 10.1 P0：mock + semi-real data

先准备 5 个 leader：

* 2 个 healthy；
* 2 个 degrading；
* 1 个 volatile but profitable。

每个 leader 准备 30 天 snapshot，用于快速演示。

## 10.2 P1：Hyperliquid API

可以接 Hyperliquid public API / SDK 拉取：

* positions；
* fills；
* equity；
* margin summary；
* realized PnL；
* leverage proxy；
* drawdown proxy。

## 10.3 P2：Nansen / leaderboard API

如果能拿到 Nansen HL leaderboard API，再接入真实 leaderboard rank。官方 Research #06 指向 Nansen HL leaderboard API 作为 slash-bonded leaderboard copy-trading 的参考。

\---

## 11\. API 设计

## 11.1 Public APIs

```txt
GET  /api/leaders
GET  /api/leaders/:leaderId
GET  /api/risk/:leaderId
GET  /api/events
```

## 11.2 x402-protected APIs

```txt
GET  /api/reports/:leaderId
POST /api/reports/:leaderId/verify-payment
```

## 11.3 Oracle APIs

```txt
POST /api/oracle/run-risk-check
POST /api/oracle/submit-risk-update
```

## 11.4 Job APIs, P1

```txt
POST /api/jobs/create-risk-audit
POST /api/jobs/:jobId/submit-deliverable
POST /api/jobs/:jobId/settle
```

\---

## 12\. 前端页面

## 12.1 P0 页面

|页面|功能|
|-|-|
|`/`|项目介绍、连接钱包、核心指标|
|`/leaders`|leader ranking、risk score、bond status|
|`/leaders/\[id]`|leader profile、AI report 摘要、bond 创建|
|`/bonds`|我的 bonds、状态、收益/退款/slash|
|`/events`|Arc on-chain event feed|
|`/demo`|给评委看的完整 walkthrough|

## 12.2 关键 UI 卡片

1. **Leader Risk Card**

   * risk score；
   * action；
   * confidence；
   * last update。
2. **Bond Card**

   * amount；
   * threshold；
   * state；
   * expiry；
   * latest report hash。
3. **AI Rationale Panel**

   * 免费版显示摘要；
   * 完整版本通过 x402 解锁。
4. **On-chain Proof Panel**

   * Arc tx；
   * contract address；
   * event name；
   * report hash。

\---

## 13\. 文件结构建议

```txt
copyguard-bond/
  apps/
    web/
      app/
      components/
      lib/
        arc/
        appkit/
        x402/
        contracts/
      api/
  agents/
    risk-worker/
      main.py
      scoring.py
      hyperliquid\_client.py
      prompts/
      schemas/
  contracts/
    src/
      CopyGuardBondVault.sol
      LeaderRegistry.sol
      RiskOracleAdapter.sol
      ReportPayment.sol
    test/
    script/
  packages/
    shared/
      types/
      schemas/
  docs/
    ARCHITECTURE.md
    DEMO\_SCRIPT.md
    ARC\_USAGE.md
    RFB\_ALIGNMENT.md
  superpowers/
    specs/
    plans/
    tasks/
```

\---

## 14\. 安装与配置

## 14.1 Arc network config

```ts
export const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: \["https://rpc.testnet.arc.network"],
      webSocket: \["wss://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arcscan",
      url: "https://testnet.arcscan.app",
    },
  },
};
```

## 14.2 App Kit install

```bash
npm install @circle-fin/app-kit
npm install @circle-fin/adapter-viem-v2 viem
```

## 14.3 Foundry

```bash
forge init contracts
forge install OpenZeppelin/openzeppelin-contracts
```

## 14.4 Python worker

```bash
cd agents/risk-worker
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn pydantic python-dotenv httpx
pip install hyperliquid-python-sdk
```

\---

## 15\. 功能优先级

## 15.1 P0：必须完成，决定能否提交

|功能|验收标准|
|-|-|
|Arc 钱包连接|用户可切换到 Arc Testnet|
|合约部署|BondVault / LeaderRegistry / ReportPayment 部署到 Arc|
|USDC gas 展示|demo 里明确展示交易在 Arc 上完成，gas 以 USDC 计价|
|Leader dashboard|至少 5 个 leader，显示 risk score|
|AI risk agent|输入 leader metrics，输出 JSON risk report|
|Create bond|用户创建 USDC-denominated bond|
|Risk update|oracle 提交 risk score，bond 状态变化|
|x402 paid report|完整报告需要 402/payment proof 解锁|
|Event feed|展示链上 BondCreated / RiskUpdated / BondWarned|
|Demo video|3 分钟以内，覆盖完整流程|
|Public GitHub|README 写清楚 Arc/Circle 使用点|

## 15.2 P1：强烈建议，提升名次概率

|功能|价值|
|-|-|
|ERC-8004-compatible agent identity|增强 agentic economy 叙事|
|ERC-8183 job escrow|follower 付 USDC 请求 agent audit|
|App Kit Send|report fee / agent fee 用 App Kit Send|
|Real Hyperliquid data|提升可信度|
|Risk report IPFS hash|提升可验证性|
|User feedback capture|提升 traction 分数|

## 15.3 P2：时间充足再做

|功能|价值|
|-|-|
|Unified Balance|用户多链 USDC 统一支付|
|CCTP / Bridge|用户从其他链桥入 USDC|
|Nansen leaderboard|更贴官方 research|
|多 agent ensemble|提升 agent sophistication|
|Slash schedule optimizer|把 empirical decay function 做成合约参数|

\---

## 16\. Claude Code / Codex + Superpowers 工作流

## 16.1 Step 1：Brainstorming

```txt
Use /brainstorming.

We are building CopyGuard Bond for Agora Agents Hackathon.
Do not code yet.

Goal:
AI detects social trading leader degradation.
Followers create USDC-denominated performance bonds on Arc.
Risk events are settled on Arc Testnet.
x402 protects paid risk reports.

Produce:
1. product requirements
2. architecture
3. smart contract modules
4. backend API
5. frontend pages
6. P0/P1/P2 scope
7. risks and mitigations
```

## 16.2 Step 2：Spec

```txt
Create a technical spec for P0 only.

Constraints:
- Must deploy to Arc Testnet.
- Must use USDC as gas.
- Must include x402-style paid report endpoint.
- Must include Foundry tests.
- Must include Next.js frontend.
- Must include AI risk agent with deterministic JSON output.
- Do not implement real trading.
```

## 16.3 Step 3：Implementation plan

```txt
Use /execute-plan.

Break implementation into atomic tasks:
1. repo scaffold
2. contracts + tests
3. Arc deployment script
4. frontend wallet connect
5. leader dashboard
6. risk worker
7. x402 paid report API
8. event indexer
9. demo seed data
10. README + video script

Each task must include acceptance tests.
```

## 16.4 Step 4：TDD

```txt
Before implementing CopyGuardBondVault, write failing Foundry tests for:
- createBond emits BondCreated
- submitRiskUpdate updates score and reportHash
- risk above threshold moves bond to Warned
- slashBond can only be called by oracle
- refundBond cannot be called after slash
```

## 16.5 Step 5：Code review

```txt
Review the implementation against:
- Arc usage requirements
- x402 paid API flow
- RFB 06 alignment
- test coverage
- security issues
- demo readiness
```

\---

## 17\. Demo 视频脚本

3 分钟视频建议：

|时间|内容|
|-|-|
|0:00–0:20|说明问题：copy traders 盲目跟随 leader，无法检测 strategy decay|
|0:20–0:50|展示 leader dashboard 和 AI risk score|
|0:50–1:20|展示 x402 解锁完整 risk report|
|1:20–1:50|用户在 Arc 上创建 USDC bond|
|1:50–2:20|oracle / AI 提交 risk update，bond 进入 WARN|
|2:20–2:45|展示 Arcscan tx、event feed、report hash|
|2:45–3:00|展示 traction：用户数、测试交易数、下一步|

\---

## 18\. README 模板

```md
# CopyGuard Bond

## What it is
Arc-native protection layer for social trading.

## RFB Alignment
RFB 06: Social Trading Intelligence.

## Why Arc
- USDC as gas
- USDC-denominated bonds
- Sub-second settlement
- Low-cost risk updates
- x402 paid reports
- Agentic economy identity / job settlement roadmap

## Architecture
\[diagram]

## Contracts
- CopyGuardBondVault
- LeaderRegistry
- RiskOracleAdapter
- ReportPayment

## Circle / Arc Usage
- Arc Testnet deployment
- USDC gas
- App Kit Send
- x402-style report payment
- ERC-8004 / ERC-8183 roadmap

## Demo
- Live link
- Video link
- Arcscan links

## Run locally
\[commands]
```

\---

## 19\. 风险与规避

|风险|说明|规避方式|
|-|-|-|
|做成普通 dashboard|没有链上经济机制会被扣分|必须实现 USDC bond + on-chain event|
|AI 幻觉影响链上状态|LLM 输出不可靠|用规则评分决定状态，LLM 只做解释|
|真实数据接入耗时|Hyperliquid/Nansen 接入可能拖慢进度|P0 使用 mock snapshots，P1 接真实 API|
|x402 集成不完整|facilitator / network 支持可能影响进度|用 x402-style 402 negotiation + Arc payment proof fallback|
|slash 设计敏感|容易被理解为赌博或惩罚|定位为 protection bond / warning / refund / risk reallocation|
|Arc 使用不深|只写 hash 不够|Arc 必须承担 gas、bond、settlement、event history、report unlock|

\---

## 20\. 最终执行建议

最小可赢版本：

> \*\*AI strategy-degradation detector + Arc USDC bond + x402 paid report + event dashboard\*\*

优先完成 P0。P1 只挑两个：

1. **App Kit Send**；
2. **ERC-8004 / ERC-8183-compatible agent/job flow**。

不要做真实 copy trading，不要做复杂清算，不要追求接入过多外部数据源。你的视频和 README 必须反复强调：

* 这是 RFB 06 Social Trading Intelligence；
* AI 真正做了 follow / reduce / exit 判断；
* follower 用 USDC bond 获得保护；
* Arc 是 gas、bond、settlement、event history 的核心层；
* x402 用于付费 risk report；
* 低费用 + 亚秒最终性让小额 follower protection 变得可行。

\---

## 21\. 官方参考链接

* Agora Agents Hackathon: https://agora.thecanteenapp.com/
* Arc Build Docs: https://docs.arc.io/build
* Arc Network Docs: https://docs.arc.io/arc-chain
* Arc Agentic Economy: https://docs.arc.io/build/agentic-economy
* Circle x402 Docs: https://developers.circle.com/gateway/nanopayments/concepts/x402
* Arc App Kit Installation: https://docs.arc.io/app-kit/tutorials/installation
* Arc Connect to Arc: https://docs.arc.io/integrate/connect-to-arc

