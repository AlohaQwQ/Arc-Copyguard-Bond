# CopyGuard Bond P0 Implementation Spec

**Date**: 2026-05-19
**Status**: Approved for Implementation
**Scope**: P0 MVP only — 7-day hackathon delivery

---

## 0. Product Definition

**One-liner**: CopyGuard Bond protects copy-traders from leader decay — AI monitors strategy degradation, followers create USDC-denominated protection bonds on Arc, and risk events settle instantly onchain.

**Target**: Agora Agents Hackathon, RFB 06: Social Trading Intelligence.

**Scoring alignment**:

| Criterion | Weight | How CopyGuard addresses it |
|---|---:|---|
| Agentic Sophistication | 30% | AI risk agent does real decision-making: follow/reduce/exit, deterministic scoring + LLM rationale |
| Traction | 30% | Demo dashboard with 5 leaders, real Arc tx, event feed, bond lifecycle |
| Circle Tool Usage | 20% | Arc Testnet, USDC as gas, USDC bonds (msg.value), x402 paid report, event monitoring |
| Innovation | 20% | Slash-bonded protection mechanism + AI degradation detection + x402 pay-per-report |

**What P0 is NOT**: Real auto-copy-trading, real custody, complex liquidation protocol, static risk-only dashboard.

---

## 1. Architecture Decisions

### 1.1 Confirmed Decisions

| Decision | Choice |
|---|---|
| AI Worker | Python FastAPI lightweight backend (no Celery/Redis/Kafka) |
| Frontend | Next.js 15 App Router + Reown AppKit + wagmi + viem |
| Contracts | Solidity ^0.8.24 + Foundry + OpenZeppelin |
| Pages | 4: `/`, `/leaders`, `/leaders/[id]`, `/events` |
| Data | Mock snapshots: 5 leaders x 30 days |
| Risk Scoring | Deterministic rule-based; LLM explanation only |
| Bond Payment | Arc native USDC via `msg.value`, 18 decimals — NOT ERC-20 approve/transferFrom |
| Report Fee | Arc native USDC via `msg.value`, 1 USDC testnet, 18 decimals |
| Bond Creation | Frontend wallet calls contract directly |
| Risk Update | FastAPI backend submits via RiskOracleAdapter to Arc |
| x402 | HTTP 402 negotiation + Arc onchain payment proof; NOT full facilitator/nanopayments |
| LLM | Optional with deterministic fallback when unavailable |
| P1/P2 excluded | Bridge, Unified Balance, real Hyperliquid/Nansen, multi-agent, CCTP |

### 1.2 Two-Service Architecture

```
User/Browser
  |
  v
Next.js Frontend (port 3000)
  |-- Reown AppKit wallet connect (Arc Testnet)
  |-- Leader dashboard, bond creation, event feed
  |-- Calls FastAPI for risk data and reports
  |-- Calls Arc contracts directly for createBond, purchaseReport
  |
  v
Python FastAPI Backend (port 8000)
  |-- Risk scoring (deterministic rule-based)
  |-- LLM rationale (with fallback)
  |-- x402 paid report API (402 negotiation + payment verification)
  |-- Risk update submission to Arc via RiskOracleAdapter
  |-- Mock leader data
  |
  v
Arc Testnet (chain 5042002)
  |-- CopyGuardBondVault.sol
  |-- LeaderRegistry.sol
  |-- RiskOracleAdapter.sol
  |-- ReportPayment.sol
  |-- USDC native gas
  |-- USDC bonds + report payments (msg.value)
```

### 1.3 Service Independence

All three services run locally with no shared state except:
- Contract ABIs + addresses (from `contracts/deployments.json`)
- Arc Testnet RPC (`https://rpc.testnet.arc.network`)

---

## 2. Smart Contracts

### 2.1 Payment Model

All USDC transfers use Arc native USDC via `msg.value`. No ERC-20 approve/transferFrom.
- `CopyGuardBondVault.createBond` — `payable`, bond amount = `msg.value`
- `ReportPayment.purchaseReport` — `payable`, report fee = `msg.value`
- Amount units: 18 decimals. UI displays as "testnet USDC".

### 2.2 Deployment Order

No circular dependencies:

```
1. LeaderRegistry
2. CopyGuardBondVault (constructor: leaderRegistry address)
3. RiskOracleAdapter (constructor: bondVault address)
4. CopyGuardBondVault.setRiskOracleAdapter(adapter address)
5. ReportPayment (constructor: no dependencies)
```

### 2.3 LeaderRegistry.sol

**Responsibility**: Register/deactivate leaders. P0: owner-only, pre-seeded at deployment.

```solidity
struct Leader {
    bytes32 id;
    string venue;        // "Hyperliquid"
    address wallet;
    bytes32 metadataHash;
    bool active;
}

function registerLeader(bytes32 id, string calldata venue, address wallet, bytes32 metadataHash) external onlyOwner;
function deactivateLeader(bytes32 id) external onlyOwner;
function getLeader(bytes32 id) external view returns (Leader memory);
function getActiveLeaders() external view returns (bytes32[] memory);
```

### 2.4 CopyGuardBondVault.sol

**Responsibility**: Bond lifecycle management.

```solidity
enum BondState { Active, Warned, Slashed, Refunded, Settled }

struct Bond {
    uint256 id;
    address follower;
    bytes32 leaderId;
    uint256 amount;          // msg.value, 18 decimals
    uint256 createdAt;
    uint256 expiry;
    uint16 riskThresholdBps;
    uint16 lastRiskScoreBps;
    bytes32 lastReportHash;
    BondState state;
}
```

**Functions**:
- `createBond(bytes32 leaderId, uint16 riskThresholdBps, uint256 expiry)` — payable, amount = msg.value
- `submitRiskUpdate(uint256 bondId, uint16 riskScoreBps, bytes32 reportHash)` — only RiskOracleAdapter. Auto-warn if riskScoreBps > riskThresholdBps
- `triggerWarning(uint256 bondId)` — only RiskOracleAdapter
- `slashBond(uint256 bondId, uint16 slashBps)` — only owner
- `refundBond(uint256 bondId)` — only owner or follower. Reverts if Slashed
- `settleBond(uint256 bondId)` — only owner, after expiry
- `setRiskOracleAdapter(address adapter)` — only owner, called once post-deploy

**Events**:
- `BondCreated(uint256 indexed bondId, address indexed follower, bytes32 indexed leaderId, uint256 amount)`
- `RiskUpdated(uint256 indexed bondId, uint16 riskScoreBps, bytes32 reportHash)`
- `BondWarned(uint256 indexed bondId, uint16 riskScoreBps)`
- `BondSlashed(uint256 indexed bondId, uint256 slashedAmount)`
- `BondRefunded(uint256 indexed bondId, uint256 amount)`
- `BondSettled(uint256 indexed bondId)`

### 2.5 RiskOracleAdapter.sol

**Responsibility**: Access control for risk updates.

- Owner manages authorized oracle addresses via `addOracle(address)` / `removeOracle(address)`
- `submitRiskUpdate(uint256 bondId, uint16 riskScoreBps, bytes32 reportHash)` — only authorized oracles, forwards to BondVault
- P0: single oracle address (FastAPI backend wallet)

### 2.6 ReportPayment.sol

**Responsibility**: Track per-user per-leader report purchases.

- `purchaseReport(bytes32 leaderId)` — payable, msg.value == REPORT_FEE (1 USDC, 18 decimals)
- `hasPurchased(address user, bytes32 leaderId)` — view, returns bool
- `REPORT_FEE()` — view, returns uint256 (hardcoded 1e18)
- Emits `ReportPurchased(address indexed user, bytes32 indexed leaderId, uint256 amount, uint256 timestamp)`

---

## 3. Contract Tests (Foundry)

Coverage requirements:

| Test | Description |
|---|---|
| createBond | Emits BondCreated, state Active, msg.value recorded |
| submitRiskUpdate | Updates riskScore + reportHash, emits RiskUpdated |
| auto-warn | risk > threshold triggers Warned, emits BondWarned |
| unauthorized oracle | Non-oracle submitRiskUpdate reverts |
| slashBond | Correct deduction, emits BondSlashed |
| refundBond | Works in Active/Warned, reverts after Slashed |
| settleBond | Works after expiry |
| purchaseReport | Emits ReportPurchased, hasPurchased true |
| duplicate purchase | Reverts or no-op (no double-charge) |
| wrong payment | createBond with 0 value reverts; purchaseReport with wrong value reverts |

Use `deal()` cheatcode to fund test addresses with native USDC.

---

## 4. Python FastAPI Backend

### 4.1 Endpoints

```
GET  /api/leaders                      # List all 5 mock leaders
GET  /api/leaders/:leaderId            # Leader detail with metrics
GET  /api/risk/:leaderId               # Free: riskScore, action, confidence, 1 summary reason
GET  /api/reports/:leaderId            # x402-protected: full degradation report
POST /api/reports/:leaderId/verify     # Verify payment proof, return report
POST /api/oracle/run-risk-check        # Body: {leaderId, bondId} → score + LLM + submit on-chain
GET  /api/events                       # Proxy Arc events (optional, frontend can read directly)
```

### 4.2 POST /api/oracle/run-risk-check

Request body:
```json
{
  "leaderId": "hl_leader_01",
  "bondId": 1
}
```

Flow:
1. Look up leader metrics from mock data
2. Run rule-based scoring → riskScoreBps
3. Generate LLM rationale (or deterministic fallback) → full report JSON
4. Compute keccak256 report hash
5. Submit risk update to RiskOracleAdapter contract on Arc (via chain.py, oracle private key from env)
6. Return risk report + tx hash

### 4.3 Risk Scoring Engine (Deterministic)

```text
riskScoreBps =
  25% * drawdownAcceleration +
  20% * winRateDecay +
  20% * leverageRegimeShift +
  15% * positionConcentration +
  10% * tradeFrequencyAnomaly +
  10% * volatilityAdjustedPnLDecay
```

Output range: 0–10000 basis points. Same input always produces same output.

### 4.4 LLM Rationale + Deterministic Fallback

**Primary path**: Call LLM (Claude/OpenAI/Gemini via `LLM_PROVIDER` env var).
- Prompt enforces strict JSON output
- Output fields: action (FOLLOW/REDUCE/EXIT), reasons[], bondAction (NONE/WARN/SLASH), recommendedAllocationBps, confidenceBps

**Fallback path** (when `LLM_PROVIDER` unset or LLM call fails):
- Generate reasons from rule-based scoring thresholds
- action from riskScoreBps ranges: <3000 FOLLOW, 3000–7000 REDUCE, >7000 EXIT
- bondAction from riskScoreBps vs threshold comparison
- recommendedAllocationBps = max(0, 10000 - riskScoreBps)
- confidenceBps = 7500 (fixed moderate confidence)
- Full report still generated with report hash

Both paths produce identical JSON schema. Demo works with or without LLM.

### 4.5 x402 Paid Report Flow

1. Client `GET /api/reports/:leaderId`
2. Backend returns `402 Payment Required`:
   ```json
   {
     "status": 402,
     "price": "1000000000000000000",
     "priceHuman": "1 USDC",
     "recipient": "0x...ReportPayment",
     "resource": "report:hl_leader_01",
     "chainId": 5042002,
     "contractAddress": "0x...ReportPayment",
     "instructions": "Call purchaseReport(leaderId) with msg.value = 1 USDC, then retry with X-Payment-Tx-Hash and X-Wallet-Address headers"
   }
   ```
3. Client calls `ReportPayment.purchaseReport(leaderId)` on Arc (payable, 1 USDC)
4. Client retries with headers: `X-Payment-Tx-Hash: 0x...` + `X-Wallet-Address: 0x...`
5. Backend verification (`x402.py`):
   - Query Arc RPC for transaction receipt by tx hash
   - Verify: tx status == success
   - Verify: to address == ReportPayment contract
   - Verify: ReportPurchased event exists in logs with matching user (X-Wallet-Address), leaderId, amount (1 USDC)
   - Verify: chainId == 5042002
6. If verified: return full report with `PAYMENT-RESPONSE` header
7. If not verified: return 402 again with error detail

### 4.6 Chain Submission (chain.py)

- Uses web3.py + Arc RPC
- Oracle private key from `ORACLE_PRIVATE_KEY` env var
- `submit_risk_update(bond_id, risk_score_bps, report_hash)` calls RiskOracleAdapter
- Called by `/api/oracle/run-risk-check` after scoring + report generation

---

## 5. Next.js Frontend

### 5.1 Tech Stack

- Next.js 15 App Router, TypeScript, Tailwind + shadcn/ui
- Reown AppKit + wagmi + viem (Arc as only/default chain)
- TanStack Query for backend data
- Arc Testnet chain config: id 5042002, native USDC (18 decimals)

### 5.2 Pages

| Page | Route | Content |
|---|---|---|
| Home | `/` | Hero + wallet connect + 3 metric cards + CTA |
| Leaders | `/leaders` | 5 leader cards with risk score, action badge |
| Leader Detail | `/leaders/[id]` | Profile + Risk Card + Report Paywall + Bond Create + My Bond |
| Events | `/events` | On-chain event feed from all contracts |

### 5.3 Key Components

- **WalletConnect**: Reown AppKit button, shows address + USDC balance
- **LeaderCard**: name, venue, risk score (color-coded), action badge, confidence
- **RiskCard**: risk score gauge, action, confidence, free summary reason
- **ReportPaywall**: unlock button → x402 flow → full report display
- **BondCreateModal**: amount input, threshold BPS, expiry → createBond via wagmi
- **MyBondCard**: current user's bond state for this leader
- **EventFeed**: filterable list of on-chain events with Arcscan links

---

## 6. Mock Data

5 leaders with 30-day daily snapshots:

| Leader | Profile | Risk Behavior |
|---|---|---|
| leader_01 | Healthy, consistent | Low risk (~1500-2500 bps), stable metrics |
| leader_02 | Healthy, conservative | Low risk (~1000-2000 bps), low leverage |
| leader_03 | Degrading, aggressive | Rising risk (~3000→8000 bps over 30 days) |
| leader_04 | Degrading, reckless | High risk (~6000→9500 bps), increasing leverage |
| leader_05 | Volatile but profitable | Fluctuating risk (~2000-6000 bps), profitable despite swings |

Fields per snapshot: pnl7d, pnl30d, maxDrawdown7d, maxDrawdown30d, winRate7d, winRate30d, avgLeverage, positionConcentration, tradeFrequencyChange.

---

## 7. Implementation Tasks

### Task 1: Repo Scaffold

**Goal**: Monorepo structure with all three workspaces independently runnable.

**Files**:
- Root: `package.json` (npm workspaces), `.gitignore`, `README.md` (placeholder)
- `apps/web/`: Next.js 15 init + Tailwind + shadcn/ui
- `agents/risk-worker/`: `requirements.txt`, `main.py` (hello world)
- `contracts/`: `forge init`, OpenZeppelin install
- Three `.env.example` files with documented variables

**Implementation Notes**:
- `apps/web/.env.example`: `NEXT_PUBLIC_ARC_RPC_URL`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_FASTAPI_URL`
- `agents/risk-worker/.env.example`: `LLM_PROVIDER`, `LLM_API_KEY`, `ARC_RPC_URL`, `ORACLE_PRIVATE_KEY`, `BOND_VAULT_ADDRESS`, `RISK_ORACLE_ADAPTER_ADDRESS`
- `contracts/.env.example`: `ARC_RPC_URL`, `DEPLOYER_PRIVATE_KEY`

**Acceptance Criteria**:
- `npm install` succeeds
- `cd contracts && forge build` succeeds
- `cd agents/risk-worker && pip install -r requirements.txt` succeeds
- `cd apps/web && npm run dev` starts without error

**Test/Build**: `npm install && cd contracts && forge build && cd ../agents/risk-worker && pip install -r requirements.txt`

**Codex Prompt**:
> Scaffold a monorepo for CopyGuard Bond with three workspaces: apps/web (Next.js 15 + TypeScript + Tailwind + shadcn/ui), agents/risk-worker (Python FastAPI + requirements.txt with fastapi, uvicorn, pydantic, python-dotenv, httpx, web3), contracts (Foundry + OpenZeppelin). Root package.json uses npm workspaces. Include .env.example for each workspace with documented variables. Do NOT write application code.

---

### Task 2: Smart Contracts

**Goal**: Implement all 4 contracts with native USDC (msg.value) payment model.

**Files**:
- `contracts/src/LeaderRegistry.sol`
- `contracts/src/CopyGuardBondVault.sol`
- `contracts/src/RiskOracleAdapter.sol`
- `contracts/src/ReportPayment.sol`

**Implementation Notes**:
- All USDC via `msg.value` (Arc native). No ERC-20 imports needed for payment.
- CopyGuardBondVault: `riskOracleAdapter` address set post-deploy via `setRiskOracleAdapter()`. Before set, `submitRiskUpdate` reverts.
- ReportPayment: `REPORT_FEE = 1e18` (1 USDC, 18 decimals). `purchaseReport` requires `msg.value == REPORT_FEE`.
- BondState transitions: Active → Warned (auto on risk > threshold) → Slashed or Refunded. Active → Settled (after expiry). No backward transitions.
- Use OpenZeppelin Ownable, ReentrancyGuard. No ERC-20 dependency.

**Acceptance Criteria**:
- `forge build` clean
- Contract interfaces match spec section 2
- No ERC-20 approve/transferFrom in any contract

**Test/Build**: `cd contracts && forge build`

**Codex Prompt**:
> Implement 4 Solidity contracts in contracts/src/ for Arc Testnet (Solidity ^0.8.24, OpenZeppelin):
>
> 1. LeaderRegistry.sol — owner registers/deactivates leaders (bytes32 id, string venue, address wallet, bytes32 metadataHash, bool active). View functions: getLeader, getActiveLeaders.
>
> 2. CopyGuardBondVault.sol — payable createBond(leaderId, riskThresholdBps, expiry) with msg.value as bond amount. BondState enum: Active, Warned, Slashed, Refunded, Settled. submitRiskUpdate(bondId, riskScoreBps, reportHash) only callable by riskOracleAdapter (set post-deploy via setRiskOracleAdapter). Auto-transition to Warned if riskScoreBps > threshold. slashBond(bondId, slashBps), refundBond(bondId), settleBond(bondId) with owner access control. Emit: BondCreated, RiskUpdated, BondWarned, BondSlashed, BondRefunded, BondSettled. Constructor takes leaderRegistry address.
>
> 3. RiskOracleAdapter.sol — owner manages authorized oracle addresses. submitRiskUpdate forwards to BondVault. Constructor takes bondVault address.
>
> 4. ReportPayment.sol — payable purchaseReport(bytes32 leaderId) with msg.value == REPORT_FEE (1e18). hasPurchased(user, leaderId) view. Emits ReportPurchased(user, leaderId, amount, timestamp). No constructor dependencies.
>
> All USDC via msg.value. No ERC-20. Use Ownable + ReentrancyGuard.

---

### Task 3: Contract Tests

**Goal**: Full lifecycle test coverage in Foundry.

**Files**:
- `contracts/test/CopyGuardBondVault.t.sol`
- `contracts/test/LeaderRegistry.t.sol`
- `contracts/test/ReportPayment.t.sol`
- `contracts/test/RiskOracleAdapter.t.sol`

**Implementation Notes**:
- Deploy all contracts in test setUp with correct order
- Use `deal(address, uint256)` to fund test addresses with native USDC
- Test `msg.value` enforcement: createBond with 0 reverts, purchaseReport with wrong amount reverts
- Test unauthorized access: non-oracle submitRiskUpdate reverts, non-owner slashBond reverts
- Test state transitions exhaustively

**Acceptance Criteria**:
- `forge test -vvv` all pass
- Coverage: bond lifecycle, payment enforcement, access control, state guards

**Test/Build**: `cd contracts && forge test -vvv`

**Codex Prompt**:
> Write comprehensive Foundry tests in contracts/test/ for all 4 CopyGuard Bond contracts. Deploy in setUp with correct order: LeaderRegistry → BondVault → RiskOracleAdapter → BondVault.setRiskOracleAdapter → ReportPayment. Use deal() to fund addresses with native USDC. Test: createBond emits BondCreated with correct msg.value; submitRiskUpdate updates score and hash; risk above threshold auto-triggers Warned; unauthorized oracle reverts; slashBond deducts correctly; refundBond works in Active/Warned but reverts after Slashed; settleBond after expiry; purchaseReport emits ReportPurchased and sets hasPurchased=true; duplicate purchaseReport handled; createBond with 0 msg.value reverts; purchaseReport with wrong msg.value reverts. Use forge-std Test.sol.

---

### Task 4: Arc Testnet Deployment

**Goal**: Deploy all contracts to Arc Testnet and pre-seed data.

**Files**:
- `contracts/script/Deploy.s.sol`
- `contracts/deployments.json` (output)

**Implementation Notes**:
- Deploy order: LeaderRegistry → CopyGuardBondVault(leaderRegistry) → RiskOracleAdapter(bondVault) → BondVault.setRiskOracleAdapter(adapter) → ReportPayment
- Post-deploy: register 5 mock leaders via LeaderRegistry.registerLeader
- Post-deploy: add oracle address via RiskOracleAdapter.addOracle(backendAddress)
- Output all addresses to `contracts/deployments.json`
- Arc RPC from env: `ARC_RPC_URL`, `DEPLOYER_PRIVATE_KEY`

**Acceptance Criteria**:
- All 4 contracts deployed on Arc Testnet
- 5 leaders registered
- Oracle address authorized
- All addresses in deployments.json
- Contracts visible on Arcscan

**Test/Build**: `cd contracts && forge script script/Deploy.s.sol --rpc-url $ARC_RPC_URL --broadcast`

**Codex Prompt**:
> Write Foundry deployment script in contracts/script/Deploy.s.sol for Arc Testnet. Deploy order: LeaderRegistry → CopyGuardBondVault(leaderRegistry address) → RiskOracleAdapter(bondVault address) → call BondVault.setRiskOracleAdapter(adapter address) → ReportPayment. After deploy: register 5 leaders (hl_leader_01 through hl_leader_05, venue "Hyperliquid", mock wallet addresses, zero metadata hash) and add oracle address. Write all deployed addresses to contracts/deployments.json. Use vm.envString for RPC URL and private key. Chain ID 5042002.

---

### Task 5: FastAPI Backend — Scaffold + Mock Data + Risk Scoring

**Goal**: FastAPI app with mock leaders and deterministic risk scoring.

**Files**:
- `agents/risk-worker/main.py`
- `agents/risk-worker/mock_data.py`
- `agents/risk-worker/scoring.py`
- `agents/risk-worker/schemas.py`
- `agents/risk-worker/config.py`

**Implementation Notes**:
- Mock data: 5 leaders per spec section 6, each with 30 days of daily metrics
- Scoring engine: weighted formula per spec section 4.3, output riskScoreBps 0–10000
- API endpoints: GET /api/leaders, GET /api/leaders/:leaderId, GET /api/risk/:leaderId, POST /api/oracle/run-risk-check (body: {leaderId, bondId})
- POST /api/oracle/run-risk-check: runs scoring but does NOT yet submit on-chain (chain.py in Task 7)
- CORS enabled for localhost:3000

**Acceptance Criteria**:
- `uvicorn main:app --reload` starts
- GET /api/leaders returns 5 leaders
- GET /api/risk/:leaderId returns deterministic risk score
- POST /api/oracle/run-risk-check with {leaderId, bondId} returns risk report with all fields
- Same input always produces same riskScoreBps

**Test/Build**: `cd agents/risk-worker && uvicorn main:app --reload`

**Codex Prompt**:
> Create Python FastAPI application in agents/risk-worker/:
> 1. config.py — settings from env: LLM_PROVIDER, LLM_API_KEY, ARC_RPC_URL, ORACLE_PRIVATE_KEY, contract addresses
> 2. mock_data.py — 5 leaders (2 healthy, 2 degrading, 1 volatile-but-profitable) with 30 days of daily snapshots: pnl7d/30d, maxDrawdown7d/30d, winRate7d/30d, avgLeverage, positionConcentration, tradeFrequencyChange
> 3. scoring.py — deterministic weighted risk scoring: 25% drawdown accel + 20% win-rate decay + 20% leverage shift + 15% concentration + 10% frequency anomaly + 10% PnL decay → riskScoreBps 0-10000. Same input → same output.
> 4. schemas.py — Pydantic models: Leader, LeaderMetrics, RiskReport (action, riskScoreBps, degradationDetected, recommendedAllocationBps, confidenceBps, reasons, bondAction, reportHash)
> 5. main.py — FastAPI with CORS for localhost:3000. Endpoints: GET /api/leaders, GET /api/leaders/:leaderId, GET /api/risk/:leaderId (free summary), POST /api/oracle/run-risk-check (body: {leaderId, bondId} → scoring only, no chain submit yet)
> Do NOT implement LLM or x402.

---

### Task 6: LLM Rationale + Deterministic Fallback

**Goal**: LLM-generated explanations with guaranteed fallback when unavailable.

**Files**:
- `agents/risk-worker/llm.py`
- Update `agents/risk-worker/main.py`, `agents/risk-worker/schemas.py`

**Implementation Notes**:
- `LLM_PROVIDER` env var: "claude", "openai", "gemini", or unset
- When set: call LLM with prompt enforcing strict JSON output (action, reasons, bondAction, recommendedAllocationBps, confidenceBps)
- When unset or call fails: deterministic fallback:
  - reasons from scoring thresholds (e.g., "winRate decayed 15% below 30d baseline")
  - action from riskScoreBps ranges: <3000 FOLLOW, 3000–7000 REDUCE, >7000 EXIT
  - bondAction: NONE if risk < threshold, WARN if risk >= threshold
  - recommendedAllocationBps: max(0, 10000 - riskScoreBps)
  - confidenceBps: 7500 (fixed)
- Both paths produce identical Pydantic schema
- Report hash: keccak256 of canonical JSON body

**Acceptance Criteria**:
- With LLM configured: full report with AI-generated reasons
- Without LLM: full report with deterministic reasons
- Both paths produce valid JSON schema
- riskScoreBps identical regardless of LLM (rule-based only)
- report hash is valid keccak256

**Test/Build**: `curl -X POST localhost:8000/api/oracle/run-risk-check -H 'Content-Type: application/json' -d '{"leaderId":"hl_leader_03","bondId":1}'`

**Codex Prompt**:
> Add LLM rationale with deterministic fallback to agents/risk-worker/llm.py:
> - Support LLM_PROVIDER env var: "claude" (Anthropic SDK), "openai" (OpenAI SDK), "gemini" (Google SDK), or unset
> - LLM path: prompt enforces strict JSON with action (FOLLOW/REDUCE/EXIT), reasons[], bondAction (NONE/WARN/SLASH), recommendedAllocationBps, confidenceBps. LLM does NOT set riskScoreBps.
> - Fallback path (unset or failed): generate reasons from scoring thresholds, action from riskScoreBps ranges (<3000 FOLLOW, 3000-7000 REDUCE, >7000 EXIT), bondAction from risk vs threshold, recommendedAllocationBps = max(0, 10000 - riskScoreBps), confidenceBps = 7500
> - Both paths produce identical Pydantic schema
> - Compute keccak256 report hash from canonical JSON
> Update main.py: POST /api/oracle/run-risk-check now includes LLM/fallback rationale in response. Add GET /api/reports/:leaderId (returns 402 for now, full implementation in Task 7).

---

### Task 7: x402 Paid Report + Chain Submission

**Goal**: Complete x402 payment verification flow and on-chain risk update submission.

**Files**:
- `agents/risk-worker/x402.py`
- `agents/risk-worker/chain.py`
- Update `agents/risk-worker/main.py`

**Implementation Notes**:
- **x402.py**:
  - `GET /api/reports/:leaderId` without valid payment → 402 with price, recipient, resource, chainId, contractAddress, instructions
  - `GET /api/reports/:leaderId` with `X-Payment-Tx-Hash` + `X-Wallet-Address` headers → verify payment
  - Verification: query Arc RPC for tx receipt → check tx status success → check `to` == ReportPayment address → parse ReportPurchased event log → verify user matches X-Wallet-Address → verify leaderId matches → verify amount == 1e18 → verify chainId == 5042002
  - If verified: return full report with PAYMENT-RESPONSE header
  - If not: return 402 with error detail
- **chain.py**:
  - web3.py connection to Arc RPC
  - `submit_risk_update(bond_id, risk_score_bps, report_hash)` calls RiskOracleAdapter.submitRiskUpdate with oracle private key
  - POST /api/oracle/run-risk-check now also submits risk update on-chain after scoring + report generation

**Acceptance Criteria**:
- Unpaid request returns 402 with all required fields
- Paid + verified request returns full report
- Verification checks: tx status, contract address, event user, leaderId, amount, chainId
- Backend can submit risk update to Arc via RiskOracleAdapter
- Risk update event visible on Arcscan

**Test/Build**: `curl -v localhost:8000/api/reports/hl_leader_03` → expect 402

**Codex Prompt**:
> Implement x402 paid report API and on-chain risk submission in agents/risk-worker/:
>
> 1. x402.py — GET /api/reports/:leaderId returns 402 with {status, price (1e18), priceHuman ("1 USDC"), recipient (ReportPayment address), resource, chainId (5042002), contractAddress, instructions} when no valid payment. With X-Payment-Tx-Hash + X-Wallet-Address headers: query Arc RPC for tx receipt, verify tx success, verify to==ReportPayment, parse ReportPurchased event, verify user==X-Wallet-Address, leaderId match, amount==1e18, chainId==5042002. Return full report if verified.
>
> 2. chain.py — web3.py connection to Arc RPC. submit_risk_update(bond_id, risk_score_bps, report_hash) calls RiskOracleAdapter.submitRiskUpdate with oracle private key from ORACLE_PRIVATE_KEY env var.
>
> Update main.py: POST /api/oracle/run-risk-check now calls chain.submit_risk_update after scoring + report generation. Update GET /api/reports/:leaderId with full x402 flow.

---

### Task 8: Next.js + Reown AppKit + Arc Config

**Goal**: Frontend scaffold with Arc wallet connection working.

**Files**:
- `apps/web/lib/arc.ts`
- `apps/web/lib/wagmi.ts`
- `apps/web/lib/contracts.ts`
- `apps/web/lib/api.ts`
- `apps/web/components/wallet-connect.tsx`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx` (placeholder)
- `apps/web/app/providers.tsx`

**Implementation Notes**:
- Arc chain config: id 5042002, name "Arc Testnet", nativeCurrency {name: "USDC", symbol: "USDC", decimals: 18}, RPC https://rpc.testnet.arc.network, blockExplorer https://testnet.arcscan.app
- Reown AppKit configured with Arc as only chain
- `contracts.ts` imports ABIs from `../../../contracts/out/` and addresses from `../../../contracts/deployments.json`
- `api.ts` — TanStack Query hooks for FastAPI endpoints
- Providers: WagmiProvider + QueryClientProvider + Reown provider
- next.config.js: API rewrites for `/api/**` → `http://localhost:8000/api/**`

**Acceptance Criteria**:
- `npm run dev` starts
- Connect Wallet button visible
- Wallet connects to Arc Testnet
- Shows address + USDC (native) balance
- API proxy to FastAPI works

**Test/Build**: `cd apps/web && npm run dev`

**Codex Prompt**:
> Set up Next.js 15 frontend in apps/web/ with Reown AppKit + wagmi + viem:
> 1. lib/arc.ts — Arc chain definition: id 5042002, USDC native currency (18 decimals), RPC https://rpc.testnet.arc.network, explorer https://testnet.arcscan.app
> 2. lib/wagmi.ts — wagmi + Reown AppKit config, Arc as default/only chain, WalletConnect project ID from env
> 3. lib/contracts.ts — import ABIs from contracts/out/ and addresses from contracts/deployments.json. Export typed contract configs for BondVault, LeaderRegistry, ReportPayment, RiskOracleAdapter.
> 4. lib/api.ts — TanStack Query hooks: useLeaders(), useLeader(id), useRisk(id), useReport(id)
> 5. components/wallet-connect.tsx — Reown AppKit connect button showing address and USDC balance
> 6. app/providers.tsx — WagmiProvider + QueryClientProvider + Reown wrapper
> 7. app/layout.tsx — root layout with providers
> 8. app/page.tsx — placeholder with connect button
> 9. next.config.js — API rewrites /api/** → http://localhost:8000/api/**
> Install: @reown/appkit @reown/appkit-adapter-wagmi wagmi viem @tanstack/react-query. Use Tailwind + shadcn/ui.

---

### Task 9: Home Page

**Goal**: Landing page with project intro, wallet connect, metrics overview.

**Files**:
- `apps/web/app/page.tsx`

**Implementation Notes**:
- Hero: "CopyGuard Bond" + tagline + brief description
- WalletConnect component
- 3 metric cards from backend: Total Leaders (count), Active Bonds (placeholder or from contract read), Risk Alerts (WARNED count)
- "View Leaders" CTA → `/leaders`
- No wallet required to view metrics

**Acceptance Criteria**:
- Page renders with hero + metrics
- Metrics fetch from backend
- CTA navigates to /leaders

**Test/Build**: `cd apps/web && npm run dev`, visit localhost:3000

**Codex Prompt**:
> Implement home page at apps/web/app/page.tsx: Hero section with "CopyGuard Bond" title and "Arc-native social trading protection layer" tagline. WalletConnect component. 3 metric cards from GET /api/leaders: Total Leaders (count), Active Bonds (placeholder 0), Risk Alerts (0). "View Leaders" button linking to /leaders. Use shadcn/ui Card + Button. No wallet required for metrics.

---

### Task 10A: Leaders List + Leader Detail Read-Only UI

**Goal**: Leaders list page and read-only leader detail (no bond/report interaction yet).

**Files**:
- `apps/web/app/leaders/page.tsx`
- `apps/web/app/leaders/[id]/page.tsx`
- `apps/web/components/leader-card.tsx`
- `apps/web/components/risk-card.tsx`
- `apps/web/hooks/use-leaders.ts`

**Implementation Notes**:
- `/leaders`: grid of LeaderCards. Each shows: name, venue, risk score (color: green <3000, yellow 3000–7000, red >7000), action badge (FOLLOW/REDUCE/EXIT), confidence, last update
- `/leaders/[id]`: Leader profile section (name, venue, metrics summary) + RiskCard (riskScoreBps gauge, action, confidence, free summary reason). Placeholder sections for "My Bond" and "Unlock Report" (disabled)
- Data from FastAPI GET /api/leaders and GET /api/risk/:leaderId

**Acceptance Criteria**:
- /leaders shows 5 leaders with risk scores
- Clicking a leader navigates to detail page
- Detail page shows profile + risk card with free summary
- Placeholder bond/report sections visible but disabled

**Test/Build**: `cd apps/web && npm run dev`

**Codex Prompt**:
> Implement two pages in apps/web/:
> 1. app/leaders/page.tsx — fetch GET /api/leaders, render grid of LeaderCards. Each card: name, venue, riskScoreBps (color-coded: green<3000, yellow 3000-7000, red>7000), action badge (FOLLOW/REDUCE/EXIT), confidenceBps, link to /leaders/[id].
> 2. app/leaders/[id]/page.tsx — fetch GET /api/leaders/:id and GET /api/risk/:id. Show: leader profile (name, venue, metrics summary), RiskCard (riskScoreBps progress bar, action, confidence, free summary reason). Placeholder disabled sections for "My Bond" and "Unlock Report".
> 3. components/leader-card.tsx, components/risk-card.tsx
> 4. hooks/use-leaders.ts — TanStack Query hooks
> Use shadcn/ui Card, Badge. No wallet interaction needed for read-only.

---

### Task 10B: BondCreateModal + MyBondCard

**Goal**: Bond creation and bond state display on leader detail page.

**Files**:
- `apps/web/components/bond-create-modal.tsx`
- `apps/web/components/bond-card.tsx`
- `apps/web/hooks/use-bonds.ts`
- Update `apps/web/app/leaders/[id]/page.tsx`

**Implementation Notes**:
- BondCreateModal: form with amount (USDC input), riskThresholdBps (slider or input, e.g. 7000), expiry (timestamp or preset e.g. 30 days). On submit: call CopyGuardBondVault.createBond via wagmi `useWriteContract`. Amount sent as msg.value.
- MyBondCard: read user's bonds from contract (iterate or use indexed mapping). Display: state (badge), amount, threshold, lastRiskScore, reportHash, expiry. Color-code by state.
- Both components require wallet connection. Show connect prompt if disconnected.
- After bond creation tx confirmed, refetch bond data.

**Acceptance Criteria**:
- Connected wallet can create bond with USDC amount + threshold + expiry
- createBond tx succeeds on Arc Testnet
- MyBondCard shows bond state after creation
- Disconnected wallet shows connect prompt instead of bond UI

**Test/Build**: `cd apps/web && npm run dev`, connect wallet, create bond

**Codex Prompt**:
> Add bond creation and display to apps/web/leader detail page:
> 1. components/bond-create-modal.tsx — form with amount (USDC, 18 decimals), riskThresholdBps (number input, e.g. 7000), expiry (preset 30 days from now). Submit calls CopyGuardBondVault.createBond via wagmi useWriteContract with msg.value = amount. Show tx pending/confirmed/success states.
> 2. components/bond-card.tsx — display user's bond for this leader: state badge (Active=green, Warned=yellow, Slashed=red, Refunded=blue, Settled=gray), amount (formatted USDC), threshold, lastRiskScore, reportHash (truncated with copy), expiry countdown.
> 3. hooks/use-bonds.ts — wagmi contract reads for user's bonds
> 4. Update leaders/[id]/page.tsx — show BondCreateModal button + MyBondCard. Require wallet connection.
> Bond amount sent as msg.value (native USDC on Arc). No ERC-20 approval needed.

---

### Task 10C: ReportPaywall + x402 Unlock Flow

**Goal**: x402 paid report unlock on leader detail page.

**Files**:
- `apps/web/components/report-paywall.tsx`
- Update `apps/web/app/leaders/[id]/page.tsx`

**Implementation Notes**:
- ReportPaywall component shows:
  - Free tier: riskScore, action, confidence, 1 summary reason (from GET /api/risk/:leaderId)
  - Locked: "Unlock Full Report — 1 USDC" button
  - Unlocked: full degradation report with feature weights, AI rationale, report hash, oracle signature
- x402 unlock flow:
  1. Click "Unlock" → fetch GET /api/reports/:leaderId → receive 402
  2. Show payment prompt with 402 response details
  3. Call ReportPayment.purchaseReport(leaderId) with msg.value = 1 USDC via wagmi
  4. Wait for tx confirmation
  5. Retry fetch with X-Payment-Tx-Hash + X-Wallet-Address headers
  6. Display full report
- Loading states: fetching → paying → verifying → displaying
- Error states: payment failed, verification failed

**Acceptance Criteria**:
- Free summary visible without payment
- "Unlock" button triggers x402 flow
- Payment via ReportPayment.purchaseReport succeeds on Arc
- Full report displays after verification
- Loading and error states handled

**Test/Build**: `cd apps/web && npm run dev`, unlock report for a leader

**Codex Prompt**:
> Add x402 paid report unlock to apps/web/leader detail page:
> 1. components/report-paywall.tsx — Shows free summary (riskScore, action, confidence, 1 reason) and "Unlock Full Report — 1 USDC" button. x402 flow: click → fetch GET /api/reports/:leaderId → receive 402 → show payment prompt → call ReportPayment.purchaseReport(leaderId) via wagmi useWriteContract with msg.value=1e18 → wait tx confirmation → retry fetch with X-Payment-Tx-Hash and X-Wallet-Address headers → display full report (degradation analysis, feature weights, AI rationale, report hash). Loading states: fetching→paying→verifying→done. Error states: payment failed, verification failed.
> 2. Update leaders/[id]/page.tsx — integrate ReportPaywall component below RiskCard
> Requires wallet connection for payment.

---

### Task 11: Events Page

**Goal**: On-chain event feed from all CopyGuard contracts.

**Files**:
- `apps/web/app/events/page.tsx`
- `apps/web/components/event-feed.tsx`
- `apps/web/hooks/use-events.ts`

**Implementation Notes**:
- Use viem `getLogs` to fetch events from BondVault and ReportPayment
- Event types with icons: BondCreated, RiskUpdated, BondWarned, BondSlashed, BondRefunded, BondSettled, ReportPurchased
- Each event: type icon + block number + tx hash (Arcscan link) + parameter summary
- Filter tabs by event type
- Poll every 5 seconds for new events (TanStack Query refetchInterval)

**Acceptance Criteria**:
- All emitted events displayed
- Arcscan tx links work
- Filter by event type works
- New events appear within 5 seconds

**Test/Build**: `cd apps/web && npm run dev`, create bond → check events page

**Codex Prompt**:
> Implement events page at apps/web/app/events/page.tsx:
> - Fetch events from CopyGuardBondVault and ReportPayment using viem getLogs
> - Display: BondCreated, RiskUpdated, BondWarned, BondSlashed, BondRefunded, BondSettled, ReportPurchased
> - Each event row: type icon/color, block number, tx hash (link to testnet.arcscan.app/tx/...), parameter summary (bondId, follower, amount, riskScore, etc.)
> - Filter tabs by event type (All, Bonds, Risk, Settlement, Reports)
> - Poll every 5 seconds via TanStack Query refetchInterval
> Create components/event-feed.tsx and hooks/use-events.ts.

---

### Task 12: Integration + README

**Goal**: End-to-end integration, full demo walkthrough, README.

**Files**:
- `README.md`
- Final CORS/proxy configuration verification

**Implementation Notes**:
- Verify full demo flow end-to-end
- README must include:
  - What it is
  - RFB 06 alignment
  - Why Arc (USDC gas, bonds, settlement, events, x402)
  - Architecture text diagram
  - Smart contracts list
  - Circle/Arc usage points
  - **x402 honesty**: "P0 uses x402-compatible HTTP 402 negotiation with Arc native USDC onchain payment proof. Full x402 facilitator / nanopayments integration is P1."
  - Run locally (3 service startup commands)
  - Arcscan testnet links
  - Demo video placeholder

**Acceptance Criteria**:
- Full demo flow: connect wallet → view leaders → view risk → unlock report → create bond → trigger risk check → view events
- README complete with all sections including x402 honesty statement
- 3 services start independently

**Test/Build**: Manual end-to-end walkthrough

**Codex Prompt**:
> Finalize CopyGuard Bond integration and README:
> 1. Verify CORS in FastAPI allows localhost:3000
> 2. Verify next.config.js API rewrite proxies /api/* to FastAPI
> 3. Write README.md with sections: What it is, RFB 06 Social Trading Intelligence alignment, Why Arc, Architecture (text diagram showing User→Next.js→FastAPI→Arc), Smart Contracts (list 4 contracts), Circle/Arc Usage (Arc Testnet, USDC gas via msg.value, USDC bonds, x402-style paid reports, event monitoring), Run Locally (3 service commands), x402 honesty statement: "P0 uses x402-compatible HTTP 402 negotiation with Arc native USDC onchain payment proof. Full x402 facilitator / nanopayments integration is P1.", Arcscan links, Demo Video placeholder.
> Do NOT add new features.

---

## 8. Task Dependencies

```
Task 1 (Scaffold)
  |
  +--→ Task 2 (Contracts) --→ Task 3 (Tests) --→ Task 4 (Deploy)
  |                                                    |
  +--→ Task 5 (FastAPI + Scoring)                      |
  |      |                                             |
  |      +--→ Task 6 (LLM + Fallback)                  |
  |             |                                      |
  |             +--→ Task 7 (x402 + Chain) ←───────────+
  |                    |
  +--→ Task 8 (Next.js + Wallet)                       |
  |      |                                             |
  |      +--→ Task 9 (Home)                            |
  |      +--→ Task 10A (Leaders Read-Only)             |
  |      |      |                                      |
  |      |      +--→ Task 10B (Bond Interaction)       |
  |      |      |      |                               |
  |      |      |      +--→ Task 10C (Report Paywall) ←+
  |      |      |
  |      +--→ Task 11 (Events)
  |
  +--→ Task 12 (Integration + README) ← all tasks
```

**Parallel execution paths**:
- Contracts path: 2 → 3 → 4
- Backend path: 5 → 6 → 7 (Task 7 blocked by Task 4)
- Frontend path: 8 → 9 + 10A (can start immediately after scaffold)

---

## 9. Out of Scope (P1/P2)

| Item | Tier | Notes |
|---|---|---|
| ERC-8004 agent identity | P1 | Register CopyGuard agent on Arc |
| ERC-8183 job escrow | P1 | Follower pays for audit job |
| App Kit Send | P1 | Use Circle App Kit for payments |
| Real Hyperliquid data | P1 | Replace mock with live API |
| Report IPFS hash | P1 | Pin full report to IPFS |
| Unified Balance | P2 | Multi-chain USDC balance |
| CCTP / Bridge | P2 | Cross-chain USDC bridge |
| Nansen leaderboard | P2 | Real leaderboard rank data |
| Multi-agent ensemble | P2 | Risk + Critic + Oracle agents |
| Full x402 facilitator | P1 | Nanopayments / Gateway mode |
