# Task 12：Integration + README

## Context / 上下文

你正在处理 **CopyGuard Bond** 项目，这是一个运行在 Arc Testnet 上的 P0 黑客松 demo，定位是面向 copy-trading followers 的 Arc-native risk protection layer。

**项目根目录**：`D:\Work\Development\AI\ClaudeCode\Agora`

Task 1–11 已全部完成并通过验收。当前是最后一个任务：**只做文档与集成 README 收口**。不要新增功能，不要修改业务代码。

---

## 1. Task 12 范围

Task 12 是最终文档与集成收口任务。

你的任务是：

1. 输出高质量的 `README.md`
2. 确保 `.env.example` 文件准确
3. 让评审者或部署者可以理解并运行项目

本任务不是新增功能任务，不是业务代码修改任务。

---

## 2. 允许修改的文件

你只允许创建或修改以下文件：

| 文件 | 操作 |
|---|---|
| `README.md` | **创建或更新**。如果 `README.md` 已存在，请保留其中有用内容，并重写整理成下文要求的最终结构。 |
| `apps/web/.env.example` | 检查并在环境变量缺失或不准确时更新 |
| `agents/risk-worker/.env.example` | 检查并在环境变量缺失或不准确时更新 |

---

## 3. 禁止修改的文件

你绝对不能修改以下内容：

- `contracts/` 下任何文件
- `agents/risk-worker/main.py`
- `agents/risk-worker/scoring.py`
- `agents/risk-worker/llm.py`
- `agents/risk-worker/x402.py`
- `agents/risk-worker/chain.py`
- `agents/risk-worker/mock_data.py`
- `agents/risk-worker/config.py`
- `agents/risk-worker/schemas.py`
- `agents/risk-worker/requirements.txt`
- `apps/web/app/` 下任何文件
- `apps/web/components/` 下任何文件
- `apps/web/hooks/` 下任何文件
- `apps/web/lib/` 下任何文件
- `apps/web/next.config.js`
- `apps/web/package.json`
- `package.json`
- `package-lock.json`
- `docs/superpowers/progress.md`
- `foundry.toml`
- `.gitignore`

---

## 4. README.md 结构要求

请在项目根目录创建或更新 `README.md`，包含以下章节。

注意：**README 正文应使用英文**。本 prompt 是中文说明，但最终 README 应是英文项目文档。

---

### 4.1 Title & One-liner

README 开头使用：

```md
# CopyGuard Bond

Arc-native protection layer for copy-trading followers — P0 demo on Arc Testnet.
```

---

### 4.2 Project Overview

说明以下内容：

- CopyGuard Bond 是一个运行在 Arc Testnet 上的 hackathon demo，chainId 为 `5042002`
- 用户可以查看 copy-trading leader 风险画像，使用 Arc native USDC 创建 protection bond，通过 x402-style payment flow 解锁完整 AI risk report，并查看链上事件
- 这是 Agora Agents hackathon 的 **demo / P0 prototype**
- **NOT** an insurance product
- **NOT** financial advice
- **NOT** guaranteed protection
- Protection bonds 是本项目设计概念，**NOT** an Arc official concept
- **NOT** production-ready
- **NOT** mainnet-deployed

---

### 4.3 Core Features

列出 6 个已实现并验收过的能力：

1. **Leader Registry** — 5 个 demo leaders，使用 deterministic risk scoring
2. **AI Risk Scoring** — rule-based scoring，支持 optional LLM rationale，并有 deterministic fallback
3. **Protection Bond Creation** — 链上 `createBond`，使用 Arc native USDC，即 `msg.value`
4. **My Bond Status** — 通过 multicall 读取用户最新 bond，5 秒实时刷新
5. **x402-style Report Unlock** — 链上支付 1 USDC，后端验证 `ReportPurchased` event，解锁完整 AI risk report
6. **On-chain Event Stream** — 从 3 个合约读取 `getLogs`，支持 chunked reading、tab filter、10 秒轮询

---

### 4.4 Architecture

说明三层架构。

#### Smart Contracts

Solidity `^0.8.24` + Foundry。

| Contract | Address | Role |
|---|---|---|
| `CopyGuardBondVault` | `0x822bBEF75F14744d11BaC553997Bd908dBE49B47` | Bond lifecycle: create, risk update, warn, slash, refund, settle |
| `ReportPayment` | `0x15832FA84424E257ACf3735e905E9a5d3B33ee82` | 1 USDC per-report payment with duplicate protection |
| `RiskOracleAdapter` | `0x63109ECE16d78A5cEc5499F7f154e107549f7965` | Oracle whitelist + risk update forwarding to BondVault |
| `LeaderRegistry` | `0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967` | Leader registration and activation management |

所有支付都使用 **Arc native `msg.value`**，18 decimals USDC。没有 ERC-20 approval 流程。

#### Backend

Python FastAPI。

- `agents/risk-worker/` — lightweight FastAPI app
- 6 个 endpoints：
  - `/health`
  - `/api/leaders`
  - `/api/leaders/{id}`
  - `/api/risk/{id}`
  - `/api/reports/{id}`，x402-style
  - `/api/oracle/run-risk-check`
- Deterministic risk scoring + optional LLM rationale
- 通过 `web3.py` 解析 receipt，验证 x402 payment
- 通过 `submit_risk_update` 提交 oracle chain update

#### Frontend

Next.js 15 + Reown AppKit + wagmi + viem。

- 4 个页面：
  - `/`
  - `/leaders`
  - `/leaders/[id]`
  - `/events`
- 使用 Reown AppKit / WalletConnect 连接钱包
- 使用 wagmi `useWriteContract` / `useReadContracts` 进行链上交互
- 使用 viem `getLogs` 读取事件，分块读取区块范围：
  - 9999 block chunks
  - 120K block lookback
- Next.js rewrites 将 `/api/*` 代理到 FastAPI `localhost:8000`

---

### 4.5 Environment Variables

#### Frontend

`apps/web/.env.example`：

```env
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
NEXT_PUBLIC_BOND_VAULT_ADDRESS=0x822bBEF75F14744d11BaC553997Bd908dBE49B47
NEXT_PUBLIC_REPORT_PAYMENT_ADDRESS=0x15832FA84424E257ACf3735e905E9a5d3B33ee82
NEXT_PUBLIC_LEADER_REGISTRY_ADDRESS=0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967
NEXT_PUBLIC_RISK_ORACLE_ADAPTER_ADDRESS=0x63109ECE16d78A5cEc5499F7f154e107549f7965
```

#### Backend

`agents/risk-worker/.env.example`：

```env
# LLM (optional — unset for deterministic fallback)
LLM_PROVIDER=
LLM_API_KEY=

# Arc
ARC_RPC_URL=https://rpc.testnet.arc.network
ORACLE_PRIVATE_KEY=your_oracle_private_key_here

# Contract addresses (filled after deployment)
BOND_VAULT_ADDRESS=0x822bBEF75F14744d11BaC553997Bd908dBE49B47
RISK_ORACLE_ADAPTER_ADDRESS=0x63109ECE16d78A5cEc5499F7f154e107549f7965
REPORT_PAYMENT_ADDRESS=0x15832FA84424E257ACf3735e905E9a5d3B33ee82
LEADER_REGISTRY_ADDRESS=0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967
```

注意：

- README 中的 env var 名称必须与实际 `.env.example` 文件完全一致
- 不要虚构新的 env var
- 如果实际代码中的 env 名称与上面不一致，以现有代码和 `.env.example` 为准，并保持一致性

---

### 4.6 Local Development

包含分步骤说明。

#### Prerequisites

- Node.js 18+
- Python 3.11+
- Foundry，仅用于 contract builds

#### Install dependencies

```bash
# Frontend，from project root
npm install

# Backend
cd agents/risk-worker
pip install -r requirements.txt
```

#### Start backend

```bash
cd agents/risk-worker
cp .env.example .env  # then fill in values
uvicorn main:app --reload --port 8000
```

#### Start frontend

```bash
# From project root
cd apps/web
cp .env.example .env.local  # then fill in NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
npm run dev
```

#### Build frontend

```bash
cd apps/web
npm run build
```

---

### 4.7 Demo Walkthrough

包含编号 walkthrough：

1. 打开 `http://localhost:3000/` — landing page with project overview and wallet entry
2. 点击 **View Leaders** → 进入 `/leaders` — 查看 5 个 demo leader risk profiles
3. 点击 leader card → 进入 `/leaders/hl_leader_03` — 查看完整 leader detail、metrics、risk summary
4. 点击 **Connect Wallet** — 打开 Reown AppKit modal，并连接 Arc Testnet
5. 在 **Create protection bond** 区域输入 amount 和 risk threshold → 点击 **Create Bond** → 在钱包确认 → 等待链上确认
6. Bond 出现在 **My Bond** card 中，展示 state、amount、risk score、Arcscan link
7. 在 **Full Risk Report** 区域点击 **Unlock Full Report - 1 USDC** → 在钱包确认 payment → 后端验证 `ReportPurchased` event → 展示完整 report，包括 risk analysis、reasons、report hash
8. 进入 `/events` — 查看来自 Arc Testnet 的 `BondCreated`、`ReportPurchased`、`RiskUpdated` events，支持 10 秒自动刷新
9. 点击任意 tx hash → 打开 Arcscan：`https://testnet.arcscan.app/tx/...`

---

### 4.8 On-chain Verification

说明：

- 所有交易都可以在 Arc Testnet 上公开验证：`https://testnet.arcscan.app`
- Bond creation：`CopyGuardBondVault.createBond` → `BondCreated` event
- Report payment：`ReportPayment.purchaseReport` → `ReportPurchased` event
- Risk updates：`RiskOracleAdapter.submitRiskUpdate` → `RiskUpdateForwarded` event
- Events page 直接通过 Arc RPC 的 `getLogs` 读取事件
- 合约地址来源：
  - `contracts/deployments/arc-testnet.json`
  - `apps/web/lib/contracts.ts`

---

### 4.9 Known Limitations

必须明确、诚实说明：

- **Arc Testnet P0** — 当前是 hackathon demo，不是 mainnet
- **Deterministic mock data** — 5 个 demo leaders，使用 rule-based scoring；LLM 是 optional
- **No real trading data** — 所有 metrics 和 risk scores 都是 synthetic
- **Bond lifecycle is partial** — `createBond` 和 `purchaseReport` 是当前主要 user-facing flows；`slashBond`、`refundBond`、`settleBond` 存在于合约中，但前端 UI 不暴露
- **No production monitoring** — 无 logging、alerting、uptime tracking
- **No user authentication** — wallet address 是唯一 identity
- **Not financial advice** — risk scores 仅用于 demonstration
- **Not insurance** — protection bonds 是项目设计概念，不是任何形式的 guarantee
- **Single-chain** — 仅 Arc Testnet，无 cross-chain support
- **No database** — leader data hardcoded in `mock_data.py`

---

### 4.10 Tech Stack Summary

| Layer | Tech |
|---|---|
| Smart Contracts | Solidity ^0.8.24, Foundry, OpenZeppelin |
| Backend | Python FastAPI, web3.py, pycryptodome |
| Frontend | Next.js 15, React 19, Reown AppKit, wagmi, viem, Tailwind CSS 4 |
| Chain | Arc Testnet, chainId 5042002 |
| Payments | Arc native USDC via `msg.value`, 18 decimals |

---

### 4.11 Deployment Notes

简短说明：

- Backend 和 frontend 可以独立部署
- Backend：
  - 使用正确 env vars
  - 运行 `uvicorn main:app --host 0.0.0.0 --port 8000`
- Frontend：
  - `npm run build && npm run start`
  - 配置生产环境的 `NEXT_PUBLIC_*` env vars，尤其是生产 API URL
- 生产部署应配置 reverse proxy，例如 nginx / caddy，并启用 HTTPS
- Docker packaging and VPS deployment are handled as a separate deployment step after Task 12

---

## 5. .env.example 检查要求

检查两个 `.env.example` 文件是否与实际代码一致。

### Frontend

`apps/web/.env.example`：

- 检查 `apps/web/lib/contracts.ts`、`apps/web/lib/arc.ts`、`apps/web/lib/wagmi.ts`、`apps/web/app/providers.tsx` 中使用的所有 `NEXT_PUBLIC_*` vars 是否都列出
- 检查 contract addresses 是否与 `contracts/deployments/arc-testnet.json` 一致
- 如果缺少 env var，补上
- 如果地址错误，修正

### Backend

`agents/risk-worker/.env.example`：

- 检查 `agents/risk-worker/config.py` 使用的所有 env vars 是否都列出
- 检查 `main.py`、`x402.py`、`chain.py`、`llm.py` 中 `from config import settings` 的实际使用情况
- 如果缺少 env var，补上

不要修改已经存在且能正常工作的 env var 名称。只能补充缺失项或修正明显错误值。

确保两个 `.env.example` 文件中都没有重复的环境变量 key。尤其是 `REPORT_PAYMENT_ADDRESS` 必须只出现一次；不要同时留下一个已填值和一个空值的 `REPORT_PAYMENT_ADDRESS`。

---

## 6. 语言与语气要求

- `README.md` 应使用 **English**
- 语气应 factual and technical
- 不要使用夸张 marketing language，例如：
  - revolutionary
  - cutting-edge
  - world-class
- 不要声称：
  - mainnet deployment
  - production readiness
  - guaranteed outcomes
- 在合适位置使用：
  - demo
  - P0 prototype
  - Arc Testnet
- README 要简洁，重点是完整准确，而不是冗长

---

## 7. 验证命令

完成修改后运行：

```bash
cd apps/web && npm run build
```

必须无错误通过。

---

## 8. Git Diff 检查

完成修改后运行：

```bash
echo "=== Allowed changes ==="
git diff --stat README.md
git diff --stat apps/web/.env.example
git diff --stat agents/risk-worker/.env.example

echo "=== Forbidden changes (must be empty) ==="
git diff --stat contracts
git diff --stat agents/risk-worker -- ':!agents/risk-worker/.env.example'
git diff --stat apps/web/app
git diff --stat apps/web/components
git diff --stat apps/web/hooks
git diff --stat apps/web/lib
git diff --stat apps/web/next.config.js
git diff --stat apps/web/package.json
git diff --stat package.json
git diff --stat package-lock.json
git diff --stat docs/superpowers/progress.md
```

预期结果：

- `README.md` 显示变更或新增
- `.env.example` 文件可以有变更，前提是确实需要更新
- 所有 forbidden paths 应无输出
- `docs/superpowers/progress.md` 不应被 Codex 修改

---

## 9. Task 12 验收 Checklist

在报告完成前，必须确认以下 30 项全部通过。

### README Content，16 项

- [ ] 1. `README.md` 存在于项目根目录
- [ ] 2. 包含 `Project Overview` section
- [ ] 3. 包含 `Core Features` section，并列出全部 6 个能力
- [ ] 4. 包含 `Architecture` section，并说明 contracts、backend、frontend
- [ ] 5. 正确列出 4 个已部署合约地址
- [ ] 6. 包含 frontend `Environment Variables` section
- [ ] 7. 包含 backend `Environment Variables` section
- [ ] 8. env var 名称与实际 `.env.example` 文件完全一致
- [ ] 9. 包含 `Local Development` section，含 install、start backend、start frontend、build commands
- [ ] 10. 包含 `Demo Walkthrough` section，并使用 numbered steps
- [ ] 11. Demo walkthrough 包含 `/leaders`
- [ ] 12. Demo walkthrough 包含 `/leaders/hl_leader_03`
- [ ] 13. Demo walkthrough 包含 `/events`
- [ ] 14. 包含 `On-chain Verification` section，并提到 Arcscan
- [ ] 15. 包含 `Known Limitations` section
- [ ] 16. 包含 `Deployment Notes` section

### Language & Accuracy，8 项

- [ ] 17. 不声称 mainnet deployment
- [ ] 18. 不声称 production ready
- [ ] 19. 不声称或暗示 insurance
- [ ] 20. 不声称 guaranteed protection
- [ ] 21. 不把 protection bonds 描述为 Arc official concept
- [ ] 22. 明确说明这是 Arc Testnet P0 / hackathon demo
- [ ] 23. Known Limitations 诚实说明 mock data 和 partial lifecycle
- [ ] 24. README 使用 English 编写

### Technical Integrity，6 项

- [ ] 25. `cd apps/web && npm run build` 无错误通过
- [ ] 26. `contracts/` 无变更
- [ ] 27. `apps/web/app/`、`apps/web/components/`、`apps/web/hooks/`、`apps/web/lib/` 无变更
- [ ] 28. `agents/risk-worker/` 源码文件无变更，只允许 `.env.example` 变更
- [ ] 29. `package.json`、`package-lock.json`、`next.config.js` 无变更
- [ ] 30. `docs/superpowers/progress.md` 未被修改

---

## 10. Do NOT

不要做以下事情：

- 写任何业务代码
- 新增功能
- 修改 contracts
- 修改 backend logic
- 修改 frontend pages or components
- 修改 `package.json` 或 `package-lock.json`
- 修改 `docs/superpowers/progress.md`
- 创建 Docker files
- 创建 deployment scripts
- 运行 long-lived services
- git commit 或 git push
- 声称 mainnet / production readiness
- 声称 insurance 或 guaranteed protection
- 把 protection bonds 描述为 Arc official concept

---

## 11. Completion / 完成输出

如果所有 checklist 全部通过，报告：

```text
Task 12 COMPLETE
README.md created
.env.example files reviewed
Build: PASS
Git diff: PASS (no forbidden changes)
Checklist: 30/30
```

如果任何项目失败，报告失败项和原因。不要更新 `progress.md`。
