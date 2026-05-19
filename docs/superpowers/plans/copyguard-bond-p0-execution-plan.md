# CopyGuard Bond P0 Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Arc-native social trading protection layer for the Agora Agents Hackathon — AI detects leader strategy degradation, followers create USDC bonds on Arc, risk events settle onchain.

**Architecture:** Three services — Solidity contracts on Arc Testnet (Foundry), Python FastAPI backend (risk scoring + LLM + x402 + chain submission), Next.js 15 frontend (Reown AppKit wallet + dashboard). All USDC payments use Arc native `msg.value`. Services communicate only via REST API and shared contract addresses.

**Tech Stack:** Solidity ^0.8.24 / Foundry / OpenZeppelin, Python 3.11+ / FastAPI / web3.py / Pydantic, Next.js 15 / TypeScript / Tailwind / shadcn-ui / Reown AppKit / wagmi / viem / TanStack Query

**Spec:** `docs/superpowers/specs/2026-05-19-copyguard-bond-p0-design.md`

---

## File Structure

```
copyguard-bond/
├── package.json                          # Root: npm workspaces
├── .gitignore
├── .env.example                          # Root-level reference
├── README.md                             # Task 12
│
├── contracts/
│   ├── foundry.toml
│   ├── .env.example                      # ARC_RPC_URL, DEPLOYER_PRIVATE_KEY
│   ├── deployments.json                  # Task 4 output
│   ├── src/
│   │   ├── LeaderRegistry.sol            # Task 2
│   │   ├── CopyGuardBondVault.sol        # Task 2
│   │   ├── RiskOracleAdapter.sol         # Task 2
│   │   └── ReportPayment.sol            # Task 2
│   ├── test/
│   │   ├── CopyGuardBondVault.t.sol      # Task 3
│   │   ├── LeaderRegistry.t.sol          # Task 3
│   │   ├── ReportPayment.t.sol           # Task 3
│   │   └── RiskOracleAdapter.t.sol       # Task 3
│   ├── script/
│   │   └── Deploy.s.sol                  # Task 4
│   └── lib/
│       └── openzeppelin-contracts/       # Task 1 install
│
├── agents/
│   └── risk-worker/
│       ├── .env.example                  # LLM_PROVIDER, LLM_API_KEY, ARC_RPC_URL, ORACLE_PRIVATE_KEY, contract addresses
│       ├── requirements.txt              # Task 1
│       ├── config.py                     # Task 5
│       ├── schemas.py                    # Task 5
│       ├── mock_data.py                  # Task 5
│       ├── scoring.py                    # Task 5
│       ├── llm.py                        # Task 6
│       ├── x402.py                       # Task 7
│       ├── chain.py                      # Task 7
│       └── main.py                       # Tasks 5→6→7 (incremental)
│
└── apps/
    └── web/
        ├── package.json
        ├── next.config.js                # Task 8
        ├── tailwind.config.ts            # Task 1
        ├── .env.example                  # NEXT_PUBLIC_ARC_RPC_URL, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, NEXT_PUBLIC_FASTAPI_URL
        ├── lib/
        │   ├── arc.ts                    # Task 8 — Arc chain config
        │   ├── wagmi.ts                  # Task 8 — wagmi + Reown config
        │   ├── contracts.ts              # Task 8 — ABIs + addresses
        │   └── api.ts                    # Task 8 — TanStack Query hooks
        ├── hooks/
        │   ├── use-leaders.ts            # Task 10A
        │   ├── use-bonds.ts              # Task 10B
        │   └── use-events.ts             # Task 11
        ├── components/
        │   ├── wallet-connect.tsx         # Task 8
        │   ├── leader-card.tsx            # Task 10A
        │   ├── risk-card.tsx              # Task 10A
        │   ├── bond-create-modal.tsx      # Task 10B
        │   ├── bond-card.tsx              # Task 10B
        │   ├── report-paywall.tsx         # Task 10C
        │   └── event-feed.tsx             # Task 11
        ├── app/
        │   ├── providers.tsx             # Task 8
        │   ├── layout.tsx                # Task 8
        │   ├── page.tsx                  # Task 9
        │   ├── leaders/
        │   │   ├── page.tsx              # Task 10A
        │   │   └── [id]/
        │   │       └── page.tsx          # Tasks 10A→10B→10C (incremental)
        │   └── events/
        │       └── page.tsx              # Task 11
        └── public/
```

---

## Execution Waves

Three parallel tracks after scaffold. Each wave can start when its dependencies are met.

```
WAVE 0 (Sequential — Day 1)
  Task 1: Repo Scaffold

WAVE 1 (Parallel — Day 1-3)
  Track A: Contracts    Track B: Backend       Track C: Frontend
  Task 2                Task 5                 Task 8
  Task 3                Task 6                 Task 9
  Task 4 ──────────────→ (unblocks Task 7)     Task 10A
                                                Task 10B (needs Task 4)
                                                Task 10C (needs Task 7)

WAVE 2 (Sequential — Day 4-5)
  Task 7 (needs Task 4 + Task 6)

WAVE 3 (Parallel — Day 5-6)
  Task 10C (needs Task 7)
  Task 11

WAVE 4 (Sequential — Day 6-7)
  Task 12: Integration + README
```

**Critical path:** Task 1 → Task 2 → Task 3 → Task 4 → Task 7 → Task 10C → Task 12

**Max parallelism after Task 1:**
- Contracts: 2 → 3 → 4 (sequential within track)
- Backend: 5 → 6 (sequential, then blocked until Task 4 for Task 7)
- Frontend: 8 → 9 + 10A → 10B (10B needs deployed contracts)

---

## Task 1: Repo Scaffold

**Depends on:** Nothing
**Blocks:** Tasks 2, 5, 8
**Track:** Foundation

**Files:**
- Create: `package.json`, `.gitignore`
- Create: `contracts/` (forge init + OpenZeppelin)
- Create: `agents/risk-worker/` (venv + requirements.txt)
- Create: `apps/web/` (Next.js 15 init + Tailwind + shadcn/ui)
- Create: `contracts/.env.example`, `agents/risk-worker/.env.example`, `apps/web/.env.example`

- [ ] **Step 1: Initialize git repo and root package.json**

Create root `package.json` with npm workspaces:
```json
{
  "name": "copyguard-bond",
  "private": true,
  "workspaces": ["apps/*"]
}
```

Create `.gitignore`:
```
node_modules/
.next/
.env
__pycache__/
*.pyc
.venv/
cache/
out/
broadcast/
lib/
```

- [ ] **Step 2: Initialize Foundry contracts workspace**

```bash
forge init contracts --no-git
cd contracts
forge install OpenZeppelin/openzeppelin-contracts
```

Create `contracts/.env.example`:
```
# Arc Testnet
ARC_RPC_URL=https://rpc.testnet.arc.network
DEPLOYER_PRIVATE_KEY=your_deployer_private_key_here
```

- [ ] **Step 3: Initialize Python agent workspace**

Create `agents/risk-worker/requirements.txt`:
```
fastapi>=0.115.0
uvicorn[standard]>=0.34.0
pydantic>=2.10.0
python-dotenv>=1.0.0
httpx>=0.28.0
web3>=7.0.0
pycryptodome>=3.21.0
```

Create `agents/risk-worker/.env.example`:
```
# LLM (optional — unset for deterministic fallback)
LLM_PROVIDER=        # "claude" | "openai" | "gemini" | unset
LLM_API_KEY=

# Arc
ARC_RPC_URL=https://rpc.testnet.arc.network
ORACLE_PRIVATE_KEY=your_oracle_private_key_here

# Contract addresses (after Task 4 deployment)
BOND_VAULT_ADDRESS=
RISK_ORACLE_ADAPTER_ADDRESS=
REPORT_PAYMENT_ADDRESS=
LEADER_REGISTRY_ADDRESS=
```

Create `agents/risk-worker/main.py` (hello world):
```python
from fastapi import FastAPI

app = FastAPI(title="CopyGuard Risk Agent")

@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 4: Initialize Next.js frontend workspace**

```bash
cd apps
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
cd web
npx shadcn@latest init
```

Create `apps/web/.env.example`:
```
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```

- [ ] **Step 5: Verify all workspaces build**

```bash
# Root
npm install

# Contracts
cd contracts && forge build

# Python
cd agents/risk-worker && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt

# Frontend
cd apps/web && npm run build
```

Expected: all three commands succeed without errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold monorepo — contracts (Foundry), backend (FastAPI), frontend (Next.js 15)"
```

**Acceptance Criteria:**
- `npm install` succeeds at root
- `cd contracts && forge build` succeeds
- `cd agents/risk-worker && pip install -r requirements.txt` succeeds
- `cd apps/web && npm run build` succeeds
- Three `.env.example` files exist with documented variables

**Verification commands:**
```bash
npm install && cd contracts && forge build && cd ../agents/risk-worker && pip install -r requirements.txt && cd ../../apps/web && npm run build
```

**Codex Prompt:**
> Scaffold a monorepo for CopyGuard Bond with three workspaces: apps/web (Next.js 15 + TypeScript + Tailwind + shadcn/ui), agents/risk-worker (Python FastAPI + requirements.txt with fastapi, uvicorn, pydantic, python-dotenv, httpx, web3), contracts (Foundry + OpenZeppelin). Root package.json uses npm workspaces. Include .env.example for each workspace with documented variables. Do NOT write application code.

---

## Task 2: Smart Contracts

**Depends on:** Task 1
**Blocks:** Task 3
**Track:** Contracts (A)

**Files:**
- Create: `contracts/src/LeaderRegistry.sol`
- Create: `contracts/src/CopyGuardBondVault.sol`
- Create: `contracts/src/RiskOracleAdapter.sol`
- Create: `contracts/src/ReportPayment.sol`

- [ ] **Step 1: Implement LeaderRegistry.sol**

Write `contracts/src/LeaderRegistry.sol`:
- `Ownable`, stores `mapping(bytes32 => Leader)` and `bytes32[] activeLeaderIds`
- `registerLeader(bytes32 id, string venue, address wallet, bytes32 metadataHash)` — onlyOwner, sets active=true, pushes to activeLeaderIds
- `deactivateLeader(bytes32 id)` — onlyOwner, sets active=false, removes from activeLeaderIds
- `getLeader(bytes32 id)` — view returns Leader
- `getActiveLeaders()` — view returns bytes32[] memory

- [ ] **Step 2: Implement CopyGuardBondVault.sol**

Write `contracts/src/CopyGuardBondVault.sol`:
- Constructor takes `address leaderRegistry`
- `BondState` enum: Active, Warned, Slashed, Refunded, Settled
- `Bond` struct: id, follower, leaderId, amount (uint256), createdAt, expiry, riskThresholdBps (uint16), lastRiskScoreBps (uint16), lastReportHash (bytes32), state
- `mapping(uint256 => Bond)` + `uint256 public nextBondId`
- `address public riskOracleAdapter` — initially address(0), set via `setRiskOracleAdapter(address)`
- `modifier onlyRiskOracle` — checks msg.sender == riskOracleAdapter
- `createBond(bytes32 leaderId, uint16 riskThresholdBps, uint256 expiry)` — payable, requires msg.value > 0, creates Bond with state=Active, emits BondCreated
- `submitRiskUpdate(uint256 bondId, uint16 riskScoreBps, bytes32 reportHash)` — onlyRiskOracle, updates lastRiskScoreBps and lastReportHash, if riskScoreBps > bond.riskThresholdBps and bond.state == Active then set bond.state = Warned and emit BondWarned, emit RiskUpdated
- `slashBond(uint256 bondId, uint16 slashBps)` — onlyOwner, calculates slashedAmount = bond.amount * slashBps / 10000, transfers slashedAmount to owner (address(this).balance must cover), updates bond.amount, sets state = Slashed, emits BondSlashed
- `refundBond(uint256 bondId)` — onlyOwner or bond.follower, requires state == Active || state == Warned, transfers bond.amount to follower, sets state = Refunded, emits BondRefunded
- `settleBond(uint256 bondId)` — onlyOwner, requires block.timestamp >= bond.expiry, sets state = Settled, emits BondSettled
- All state-changing functions use `nonReentrant`
- No ERC-20 imports. All value transfers use native `call{value: ...}`

- [ ] **Step 3: Implement RiskOracleAdapter.sol**

Write `contracts/src/RiskOracleAdapter.sol`:
- Constructor takes `address bondVault`
- `mapping(address => bool) public isAuthorizedOracle`
- `addOracle(address oracle)` / `removeOracle(address oracle)` — onlyOwner
- `submitRiskUpdate(uint256 bondId, uint16 riskScoreBps, bytes32 reportHash)` — requires isAuthorizedOracle[msg.sender], calls IBondVault(bondVault).submitRiskUpdate(bondId, riskScoreBps, reportHash)
- Define minimal `IBondVault` interface with `submitRiskUpdate`

- [ ] **Step 4: Implement ReportPayment.sol**

Write `contracts/src/ReportPayment.sol`:
- `uint256 public constant REPORT_FEE = 1e18` (1 USDC, 18 decimals)
- `mapping(address => mapping(bytes32 => bool)) public hasPurchased`
- `purchaseReport(bytes32 leaderId)` — payable, requires msg.value == REPORT_FEE, sets hasPurchased[msg.sender][leaderId] = true, emits ReportPurchased(msg.sender, leaderId, msg.value, block.timestamp)
- Duplicate purchase: revert if already purchased (no double-charge)

- [ ] **Step 5: Verify contracts compile**

```bash
cd contracts && forge build
```

Expected: all 4 contracts compile without errors or warnings.

- [ ] **Step 6: Commit**

```bash
git add contracts/src/
git commit -m "feat: implement LeaderRegistry, CopyGuardBondVault, RiskOracleAdapter, ReportPayment contracts"
```

**Acceptance Criteria:**
- `forge build` clean, no errors
- No ERC-20 approve/transferFrom anywhere
- All USDC via msg.value
- BondState transitions: Active → Warned (auto) → Slashed/Refunded, Active → Settled
- CopyGuardBondVault.riskOracleAdapter starts as address(0), set post-deploy

**Verification:**
```bash
cd contracts && forge build
```

**Codex Prompt:**
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

## Task 3: Contract Tests

**Depends on:** Task 2
**Blocks:** Task 4
**Track:** Contracts (A)

**Files:**
- Create: `contracts/test/LeaderRegistry.t.sol`
- Create: `contracts/test/CopyGuardBondVault.t.sol`
- Create: `contracts/test/RiskOracleAdapter.t.sol`
- Create: `contracts/test/ReportPayment.t.sol`

- [ ] **Step 1: Write LeaderRegistry tests**

Test cases:
- registerLeader stores leader data correctly
- registerLeader emits no event (or emits LeaderRegistered if you added one)
- getActiveLeaders returns all registered leaders
- deactivateLeader sets active=false and removes from list
- non-owner cannot registerLeader (reverts)

- [ ] **Step 2: Write CopyGuardBondVault tests**

Test setUp deploys: LeaderRegistry → BondVault → RiskOracleAdapter → BondVault.setRiskOracleAdapter
Use `deal(address(follower), 10e18)` to fund follower with native USDC.

Test cases:
- `createBond` with msg.value=1e18 emits BondCreated, bond state Active, amount=1e18
- `createBond` with msg.value=0 reverts
- `submitRiskUpdate` via RiskOracleAdapter updates lastRiskScoreBps and lastReportHash, emits RiskUpdated
- risk score > threshold auto-transitions to Warned, emits BondWarned
- risk score <= threshold keeps Active
- direct call to BondVault.submitRiskUpdate (not via adapter) reverts
- `slashBond` reduces amount correctly, emits BondSlashed, state becomes Slashed
- `refundBond` in Active state transfers amount back, state becomes Refunded
- `refundBond` in Warned state works
- `refundBond` in Slashed state reverts
- `settleBond` before expiry reverts
- `settleBond` after expiry (use `vm.warp`) works, state becomes Settled
- non-owner cannot call slashBond

- [ ] **Step 3: Write ReportPayment tests**

Test cases:
- `purchaseReport` with msg.value=1e18 emits ReportPurchased, hasPurchased returns true
- `purchaseReport` with msg.value=0 reverts
- `purchaseReport` with msg.value=2e18 reverts
- duplicate `purchaseReport` reverts (no double-charge)

- [ ] **Step 4: Write RiskOracleAdapter tests**

Test cases:
- `addOracle` authorizes address
- `removeOracle` deauthorizes address
- authorized oracle can call submitRiskUpdate (forwards to BondVault)
- unauthorized address cannot call submitRiskUpdate (reverts)
- non-owner cannot addOracle (reverts)

- [ ] **Step 5: Run all tests**

```bash
cd contracts && forge test -vvv
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add contracts/test/
git commit -m "test: add Foundry tests for all 4 CopyGuard Bond contracts"
```

**Acceptance Criteria:**
- `forge test -vvv` — all tests pass
- Coverage: bond lifecycle (create→warn→slash, create→refund, create→settle), payment enforcement (msg.value checks), access control (onlyOwner, onlyRiskOracle), state guards (no backward transitions)

**Verification:**
```bash
cd contracts && forge test -vvv
```

**Codex Prompt:**
> Write comprehensive Foundry tests in contracts/test/ for all 4 CopyGuard Bond contracts. Deploy in setUp with correct order: LeaderRegistry → BondVault → RiskOracleAdapter → BondVault.setRiskOracleAdapter → ReportPayment. Use deal() to fund addresses with native USDC. Test: createBond emits BondCreated with correct msg.value; submitRiskUpdate updates score and hash; risk above threshold auto-triggers Warned; unauthorized oracle reverts; slashBond deducts correctly; refundBond works in Active/Warned but reverts after Slashed; settleBond after expiry; purchaseReport emits ReportPurchased and sets hasPurchased=true; duplicate purchaseReport handled; createBond with 0 msg.value reverts; purchaseReport with wrong msg.value reverts. Use forge-std Test.sol.

---

## Task 4: Arc Testnet Deployment

**Depends on:** Task 3
**Blocks:** Task 7, Task 10B
**Track:** Contracts (A) — final

**Files:**
- Create: `contracts/script/Deploy.s.sol`
- Create: `contracts/deployments.json` (script output)

- [ ] **Step 1: Write deployment script**

Write `contracts/script/Deploy.s.sol`:
- Read `ARC_RPC_URL` and `DEPLOYER_PRIVATE_KEY` from env
- Deploy in order:
  1. LeaderRegistry
  2. CopyGuardBondVault(leaderRegistry)
  3. RiskOracleAdapter(bondVault)
  4. Call BondVault.setRiskOracleAdapter(riskOracleAdapter)
  5. ReportPayment
- Post-deploy actions:
  - Register 5 leaders: hl_leader_01 through hl_leader_05
    - Venues: all "Hyperliquid"
    - Wallets: 0x1111... through 0x5555... (mock addresses)
    - MetadataHash: bytes32(0)
  - Add oracle: read `ORACLE_ADDRESS` from env, call RiskOracleAdapter.addOracle

- [ ] **Step 2: Configure .env and run deployment**

```bash
cd contracts
# Copy .env.example to .env and fill in real values
forge script script/Deploy.s.sol --rpc-url $ARC_RPC_URL --broadcast
```

Expected: broadcast shows 4 contract deployments + leader registrations + oracle authorization.

- [ ] **Step 3: Save deployed addresses**

After broadcast, write `contracts/deployments.json`:
```json
{
  "chainId": 5042002,
  "network": "arc-testnet",
  "contracts": {
    "LeaderRegistry": "0x...",
    "CopyGuardBondVault": "0x...",
    "RiskOracleAdapter": "0x...",
    "ReportPayment": "0x..."
  },
  "oracleAddress": "0x..."
}
```

- [ ] **Step 4: Verify on Arcscan**

Open each contract address on `https://testnet.arcscan.app/address/0x...` and verify:
- Contract code exists
- LeaderRegistry shows 5 registered leaders (read contract)
- RiskOracleAdapter shows oracle authorized (read contract)

- [ ] **Step 5: Commit**

```bash
git add contracts/script/Deploy.s.sol contracts/deployments.json
git commit -m "feat: add Arc Testnet deployment script and deployed addresses"
```

**Acceptance Criteria:**
- 4 contracts deployed on Arc Testnet
- 5 leaders registered in LeaderRegistry
- Oracle address authorized in RiskOracleAdapter
- All addresses saved in `contracts/deployments.json`
- Contracts visible on Arcscan

**Verification:**
```bash
cd contracts && forge script script/Deploy.s.sol --rpc-url $ARC_RPC_URL --broadcast
# Then verify on https://testnet.arcscan.app
```

**Codex Prompt:**
> Write Foundry deployment script in contracts/script/Deploy.s.sol for Arc Testnet. Deploy order: LeaderRegistry → CopyGuardBondVault(leaderRegistry address) → RiskOracleAdapter(bondVault address) → call BondVault.setRiskOracleAdapter(adapter address) → ReportPayment. After deploy: register 5 leaders (hl_leader_01 through hl_leader_05, venue "Hyperliquid", mock wallet addresses, zero metadata hash) and add oracle address. Write all deployed addresses to contracts/deployments.json. Use vm.envString for RPC URL and private key. Chain ID 5042002.

---

## Task 5: FastAPI Backend — Scaffold + Mock Data + Risk Scoring

**Depends on:** Task 1
**Blocks:** Task 6
**Track:** Backend (B)

**Files:**
- Create: `agents/risk-worker/config.py`
- Create: `agents/risk-worker/schemas.py`
- Create: `agents/risk-worker/mock_data.py`
- Create: `agents/risk-worker/scoring.py`
- Modify: `agents/risk-worker/main.py`

- [ ] **Step 1: Write config.py**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    LLM_PROVIDER: str | None = None  # "claude" | "openai" | "gemini" | None
    LLM_API_KEY: str | None = None
    ARC_RPC_URL: str = "https://rpc.testnet.arc.network"
    ORACLE_PRIVATE_KEY: str | None = None
    BOND_VAULT_ADDRESS: str | None = None
    RISK_ORACLE_ADAPTER_ADDRESS: str | None = None
    REPORT_PAYMENT_ADDRESS: str | None = None
    LEADER_REGISTRY_ADDRESS: str | None = None

    class Config:
        env_file = ".env"

settings = Settings()
```

- [ ] **Step 2: Write schemas.py**

Pydantic models:
- `LeaderMetrics`: pnl7d, pnl30d, maxDrawdown7d, maxDrawdown30d, winRate7d, winRate30d, avgLeverage, positionConcentration, tradeFrequencyChange (all float)
- `Leader`: id (str), name (str), venue (str), metrics (LeaderMetrics)
- `RiskSummary`: leaderId (str), riskScoreBps (int), action (str), confidenceBps (int), summaryReason (str)
- `RiskReport`: leaderId, riskScoreBps (int), degradationDetected (bool), action (str), recommendedAllocationBps (int), confidenceBps (int), reasons (list[str]), bondAction (str), reportHash (str)

- [ ] **Step 3: Write mock_data.py**

5 leaders, each with 30 daily metric snapshots:
- hl_leader_01: "Alpha Whale" — healthy, consistent (low risk ~1500-2500)
- hl_leader_02: "Steady Eddie" — healthy, conservative (low risk ~1000-2000)
- hl_leader_03: "Reckless Raj" — degrading, aggressive (rising risk ~3000→8000)
- hl_leader_04: "Danger Dan" — degrading, reckless (high risk ~6000→9500)
- hl_leader_05: "Volatile Vera" — volatile but profitable (fluctuating ~2000-6000)

Each snapshot: date + all 9 metric fields.
Helper functions: `get_all_leaders()`, `get_leader(id)`, `get_latest_metrics(id)`

- [ ] **Step 4: Write scoring.py**

Deterministic scoring function `calculate_risk_score(metrics: LeaderMetrics) -> int`:
- Normalize each metric to 0-10000 range
- Weighted sum: 25% drawdown_accel + 20% win_rate_decay + 20% leverage_shift + 15% concentration + 10% frequency_anomaly + 10% pnl_decay
- Clamp output to 0-10000
- Same input always produces same output (no randomness, no external calls)

- [ ] **Step 5: Update main.py with API endpoints**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# ... imports

app = FastAPI(title="CopyGuard Risk Agent")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], ...)

@app.get("/api/leaders")
@app.get("/api/leaders/{leader_id}")
@app.get("/api/risk/{leader_id}")        # free summary
@app.post("/api/oracle/run-risk-check")   # body: {leaderId, bondId}
```

`POST /api/oracle/run-risk-check` flow:
1. Look up leader metrics
2. Run scoring.py → riskScoreBps
3. Generate deterministic reasons (LLM added in Task 6)
4. Return RiskReport (no chain submit yet — Task 7 adds it)

- [ ] **Step 6: Verify backend starts and responds**

```bash
cd agents/risk-worker && source .venv/bin/activate
uvicorn main:app --reload
```

```bash
curl http://localhost:8000/api/leaders
curl http://localhost:8000/api/risk/hl_leader_03
curl -X POST http://localhost:8000/api/oracle/run-risk-check -H 'Content-Type: application/json' -d '{"leaderId":"hl_leader_03","bondId":1}'
```

Expected:
- `/api/leaders` returns array of 5 leaders
- `/api/risk/hl_leader_03` returns riskScoreBps in 3000-8000 range (degrading)
- Same leader always returns same riskScoreBps

- [ ] **Step 7: Commit**

```bash
git add agents/risk-worker/
git commit -m "feat: FastAPI backend with mock data, deterministic risk scoring, and API endpoints"
```

**Acceptance Criteria:**
- `uvicorn main:app --reload` starts without error
- `GET /api/leaders` returns 5 leaders
- `GET /api/risk/:leaderId` returns deterministic riskScoreBps
- `POST /api/oracle/run-risk-check` with {leaderId, bondId} returns full RiskReport
- Same input always produces same riskScoreBps
- CORS allows localhost:3000

**Verification:**
```bash
cd agents/risk-worker && uvicorn main:app --reload
# In another terminal:
curl http://localhost:8000/api/leaders | python -m json.tool
curl http://localhost:8000/api/risk/hl_leader_03 | python -m json.tool
curl -X POST http://localhost:8000/api/oracle/run-risk-check -H 'Content-Type: application/json' -d '{"leaderId":"hl_leader_03","bondId":1}' | python -m json.tool
```

**Codex Prompt:**
> Create Python FastAPI application in agents/risk-worker/:
> 1. config.py — settings from env: LLM_PROVIDER, LLM_API_KEY, ARC_RPC_URL, ORACLE_PRIVATE_KEY, contract addresses
> 2. mock_data.py — 5 leaders (2 healthy, 2 degrading, 1 volatile-but-profitable) with 30 days of daily snapshots: pnl7d/30d, maxDrawdown7d/30d, winRate7d/30d, avgLeverage, positionConcentration, tradeFrequencyChange
> 3. scoring.py — deterministic weighted risk scoring: 25% drawdown accel + 20% win-rate decay + 20% leverage shift + 15% concentration + 10% frequency anomaly + 10% PnL decay → riskScoreBps 0-10000. Same input → same output.
> 4. schemas.py — Pydantic models: Leader, LeaderMetrics, RiskReport (action, riskScoreBps, degradationDetected, recommendedAllocationBps, confidenceBps, reasons, bondAction, reportHash)
> 5. main.py — FastAPI with CORS for localhost:3000. Endpoints: GET /api/leaders, GET /api/leaders/:leaderId, GET /api/risk/:leaderId (free summary), POST /api/oracle/run-risk-check (body: {leaderId, bondId} → scoring only, no chain submit yet)
> Do NOT implement LLM or x402.

---

## Task 6: LLM Rationale + Deterministic Fallback

**Depends on:** Task 5
**Blocks:** Task 7
**Track:** Backend (B)

**Files:**
- Create: `agents/risk-worker/llm.py`
- Modify: `agents/risk-worker/main.py`
- Modify: `agents/risk-worker/schemas.py`

- [ ] **Step 1: Write llm.py with dual-path rationale generation**

Function `generate_rationale(metrics, risk_score_bps, threshold_bps) -> RationaleResult`:

**LLM path** (when `LLM_PROVIDER` is set):
- Build prompt enforcing strict JSON output
- Call appropriate SDK (anthropic / openai / google.generativeai)
- Parse response, validate against schema
- If call fails or parse fails → fall through to deterministic path

**Deterministic fallback path** (when `LLM_PROVIDER` unset or LLM failed):
- Generate reasons from metric thresholds:
  - If drawdown_accel > 0.3: "Drawdown acceleration exceeded safe threshold"
  - If win_rate_decay > 0.15: "7d win rate dropped significantly below 30d baseline"
  - If leverage_shift > 5.0: "Leverage regime shifted upward, indicating increased risk"
  - If concentration > 0.6: "Position concentration above safe diversification level"
  - If frequency_anomaly > 1.5: "Trade frequency anomaly detected"
  - If pnl_decay > 0.2: "Volatility-adjusted PnL declining"
- action: <3000 FOLLOW, 3000–7000 REDUCE, >7000 EXIT
- bondAction: NONE if risk < threshold, WARN if risk >= threshold
- recommendedAllocationBps: max(0, 10000 - riskScoreBps)
- confidenceBps: 7500

Both paths return identical schema.

- [ ] **Step 2: Add keccak256 report hash computation**

Function `compute_report_hash(report_dict) -> str`:
- Canonicalize JSON (sorted keys, no whitespace)
- Compute keccak256 using `Crypto.Hash.keccak` from pycryptodome
- Return hex string with "0x" prefix

- [ ] **Step 3: Update main.py to integrate llm.py**

- `POST /api/oracle/run-risk-check` now calls `generate_rationale` after scoring
- Report hash computed from full report JSON
- `GET /api/reports/:leaderId` added — returns 402 for now (x402 logic in Task 7)

- [ ] **Step 4: Verify both paths work**

```bash
# Test with no LLM (deterministic fallback)
curl -X POST http://localhost:8000/api/oracle/run-risk-check -H 'Content-Type: application/json' -d '{"leaderId":"hl_leader_03","bondId":1}'
```

Expected: full report with deterministic reasons, valid reportHash (0x... keccak256), riskScoreBps unchanged from Task 5.

If LLM configured, verify LLM path produces different reasons but same riskScoreBps.

- [ ] **Step 5: Commit**

```bash
git add agents/risk-worker/llm.py agents/risk-worker/main.py agents/risk-worker/schemas.py
git commit -m "feat: add LLM rationale with deterministic fallback and keccak256 report hash"
```

**Acceptance Criteria:**
- Without LLM_PROVIDER: full report with deterministic reasons
- With LLM_PROVIDER: full report with AI-generated reasons
- Both paths: same riskScoreBps, identical JSON schema, valid keccak256 reportHash
- LLM failure gracefully falls back to deterministic

**Verification:**
```bash
curl -X POST http://localhost:8000/api/oracle/run-risk-check -H 'Content-Type: application/json' -d '{"leaderId":"hl_leader_03","bondId":1}' | python -m json.tool
# Check: riskScoreBps same as before, reasons populated, reportHash is 0x...
```

**Codex Prompt:**
> Add LLM rationale with deterministic fallback to agents/risk-worker/llm.py:
> - Support LLM_PROVIDER env var: "claude" (Anthropic SDK), "openai" (OpenAI SDK), "gemini" (Google SDK), or unset
> - LLM path: prompt enforces strict JSON with action (FOLLOW/REDUCE/EXIT), reasons[], bondAction (NONE/WARN/SLASH), recommendedAllocationBps, confidenceBps. LLM does NOT set riskScoreBps.
> - Fallback path (unset or failed): generate reasons from scoring thresholds, action from riskScoreBps ranges (<3000 FOLLOW, 3000-7000 REDUCE, >7000 EXIT), bondAction from risk vs threshold, recommendedAllocationBps = max(0, 10000 - riskScoreBps), confidenceBps = 7500
> - Both paths produce identical Pydantic schema
> - Compute keccak256 report hash from canonical JSON
> Update main.py: POST /api/oracle/run-risk-check now includes LLM/fallback rationale in response. Add GET /api/reports/:leaderId (returns 402 for now, full implementation in Task 7).

---

## Task 7: x402 Paid Report + Chain Submission

**Depends on:** Task 4 (deployed contracts) + Task 6
**Blocks:** Task 10C
**Track:** Backend (B) — final

**Files:**
- Create: `agents/risk-worker/x402.py`
- Create: `agents/risk-worker/chain.py`
- Modify: `agents/risk-worker/main.py`

- [ ] **Step 1: Write x402.py — 402 response builder**

Function `build_402_response(leader_id, report_payment_address) -> dict`:
Returns JSON with: status=402, price="1000000000000000000", priceHuman="1 USDC", recipient (ReportPayment address), resource=f"report:{leader_id}", chainId=5042002, contractAddress (ReportPayment), instructions string.

- [ ] **Step 2: Write x402.py — payment verification**

Function `verify_payment(tx_hash, wallet_address, leader_id, report_payment_address, arc_rpc_url) -> tuple[bool, str]`:
1. Query Arc RPC `eth_getTransactionReceipt` by tx_hash
2. Verify tx status == 1 (success)
3. Verify `to` == report_payment_address
4. Parse logs for ReportPurchased event (topic0 = keccak256 of event signature)
5. Decode indexed parameters: user, leaderId
6. Verify decoded user == wallet_address
7. Verify decoded leaderId matches expected
8. Verify non-indexed amount == 1e18
9. All checks pass → return (True, "verified")
10. Any check fails → return (False, specific error message)

- [ ] **Step 3: Write chain.py — risk update submission**

Function `submit_risk_update(bond_id, risk_score_bps, report_hash) -> str`:
1. Connect to Arc RPC via web3.py
2. Load oracle private key from settings
3. Build transaction: call RiskOracleAdapter.submitRiskUpdate(bond_id, risk_score_bps, report_hash)
4. Sign and send
5. Wait for receipt
6. Return tx hash

- [ ] **Step 4: Update main.py — integrate x402 and chain submission**

`GET /api/reports/:leaderId`:
- No payment headers → return 402 (build_402_response)
- With X-Payment-Tx-Hash + X-Wallet-Address → verify_payment → if valid, return full report; if not, return 402 with error

`POST /api/oracle/run-risk-check`:
- After scoring + rationale → call chain.submit_risk_update
- Return risk report + chain tx hash

- [ ] **Step 5: Verify x402 flow**

```bash
# Expect 402
curl -v http://localhost:8000/api/reports/hl_leader_03
# Should return 402 with payment details

# Expect 402 with error (fake tx hash)
curl -v http://localhost:8000/api/reports/hl_leader_03 -H "X-Payment-Tx-Hash: 0x0000..." -H "X-Wallet-Address: 0x1234..."
# Should return 402 with verification error
```

- [ ] **Step 6: Verify chain submission**

```bash
curl -X POST http://localhost:8000/api/oracle/run-risk-check -H 'Content-Type: application/json' -d '{"leaderId":"hl_leader_03","bondId":1}'
# Response should include tx_hash field
```

Verify on Arcscan: RiskUpdated event visible.

- [ ] **Step 7: Commit**

```bash
git add agents/risk-worker/x402.py agents/risk-worker/chain.py agents/risk-worker/main.py
git commit -m "feat: x402 paid report verification and on-chain risk update submission"
```

**Acceptance Criteria:**
- `GET /api/reports/:leaderId` without payment → 402 with all fields (price, recipient, chainId, contractAddress, instructions)
- With valid payment headers + valid tx → full report returned
- Verification checks: tx status, contract address, event user, leaderId, amount, chainId
- `POST /api/oracle/run-risk-check` submits risk update on Arc
- Risk update event visible on Arcscan

**Verification:**
```bash
curl -v http://localhost:8000/api/reports/hl_leader_03
# Expect 402
curl -X POST http://localhost:8000/api/oracle/run-risk-check -H 'Content-Type: application/json' -d '{"leaderId":"hl_leader_03","bondId":1}'
# Expect report + tx_hash
```

**Codex Prompt:**
> Implement x402 paid report API and on-chain risk submission in agents/risk-worker/:
>
> 1. x402.py — GET /api/reports/:leaderId returns 402 with {status, price (1e18), priceHuman ("1 USDC"), recipient (ReportPayment address), resource, chainId (5042002), contractAddress, instructions} when no valid payment. With X-Payment-Tx-Hash + X-Wallet-Address headers: query Arc RPC for tx receipt, verify tx success, verify to==ReportPayment, parse ReportPurchased event, verify user==X-Wallet-Address, leaderId match, amount==1e18, chainId==5042002. Return full report if verified.
>
> 2. chain.py — web3.py connection to Arc RPC. submit_risk_update(bond_id, risk_score_bps, report_hash) calls RiskOracleAdapter.submitRiskUpdate with oracle private key from ORACLE_PRIVATE_KEY env var.
>
> Update main.py: POST /api/oracle/run-risk-check now calls chain.submit_risk_update after scoring + report generation. Update GET /api/reports/:leaderId with full x402 flow.

---

## Task 8: Next.js + Reown AppKit + Arc Config

**Depends on:** Task 1
**Blocks:** Tasks 9, 10A, 11
**Track:** Frontend (C)

**Files:**
- Create: `apps/web/lib/arc.ts`
- Create: `apps/web/lib/wagmi.ts`
- Create: `apps/web/lib/contracts.ts`
- Create: `apps/web/lib/api.ts`
- Create: `apps/web/components/wallet-connect.tsx`
- Create: `apps/web/app/providers.tsx`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/next.config.js`

- [ ] **Step 1: Install frontend dependencies**

```bash
cd apps/web
npm install @reown/appkit @reown/appkit-adapter-wagmi wagmi viem@2.x @tanstack/react-query
npx shadcn@latest add card button badge
```

- [ ] **Step 2: Write lib/arc.ts — Arc chain definition**

```typescript
import { defineChain } from 'viem'

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'Arcscan', url: 'https://testnet.arcscan.app' },
  },
})
```

- [ ] **Step 3: Write lib/wagmi.ts — Reown + wagmi config**

Configure wagmi with arcTestnet as only chain, Reown AppKit adapter, WalletConnect project ID from env.

- [ ] **Step 4: Write lib/contracts.ts — ABIs + addresses**

Import ABIs from `../../../contracts/out/` (Foundry compilation output).
Import addresses from `../../../contracts/deployments.json`.
Export typed contract config objects for each contract.

- [ ] **Step 5: Write lib/api.ts — TanStack Query hooks**

Hooks: `useLeaders()`, `useLeader(id)`, `useRisk(id)`.
All hooks fetch from `/api/...` which proxies to FastAPI via next.config.js rewrite.

- [ ] **Step 6: Write components/wallet-connect.tsx**

Reown AppKit button wrapper. Shows connected address + native USDC balance when connected, "Connect Wallet" when disconnected.

- [ ] **Step 7: Write app/providers.tsx**

Wrap children with: WagmiProvider → QueryClientProvider → Reown AppKit provider.

- [ ] **Step 8: Update app/layout.tsx**

Root layout with providers wrapper, metadata (title: "CopyGuard Bond"), global styles.

- [ ] **Step 9: Write next.config.js — API proxy**

```javascript
module.exports = {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:8000/api/:path*' },
    ]
  },
}
```

- [ ] **Step 10: Update app/page.tsx — placeholder**

Minimal page with WalletConnect component and "CopyGuard Bond" heading.

- [ ] **Step 11: Verify frontend starts and wallet connects**

```bash
cd apps/web && npm run dev
```

Expected:
- localhost:3000 loads
- Connect Wallet button visible
- Clicking connects to Arc Testnet
- Shows address + USDC balance

- [ ] **Step 12: Commit**

```bash
git add apps/web/
git commit -m "feat: Next.js frontend with Reown AppKit wallet, Arc chain config, API proxy"
```

**Acceptance Criteria:**
- `npm run dev` starts without error
- Connect Wallet button visible and functional
- Wallet connects to Arc Testnet (chain 5042002)
- Shows connected address + USDC balance
- API proxy `/api/*` → `http://localhost:8000/api/*` configured

**Verification:**
```bash
cd apps/web && npm run dev
# Open http://localhost:3000 — connect wallet — verify Arc Testnet + USDC balance
```

**Codex Prompt:**
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

## Task 9: Home Page

**Depends on:** Task 8
**Blocks:** None
**Track:** Frontend (C)

**Files:**
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Implement home page**

Sections:
- Hero: "CopyGuard Bond" title + "Arc-native social trading protection layer" tagline + 1-2 sentence description
- WalletConnect component
- 3 metric cards in a row: Total Leaders (from useLeaders count), Active Bonds (placeholder 0), Risk Alerts (placeholder 0)
- "View Leaders" CTA button → `/leaders`
- Use shadcn/ui Card, Button components

- [ ] **Step 2: Verify page renders**

```bash
cd apps/web && npm run dev
# Visit http://localhost:3000
```

Expected: hero + wallet connect + 3 metric cards + CTA. Metrics visible without wallet.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/page.tsx
git commit -m "feat: home page with hero, metrics cards, wallet connect"
```

**Acceptance Criteria:**
- Page renders with hero section + wallet connect + 3 metric cards
- Metrics fetch from backend (Total Leaders count shows 5)
- No wallet required to view metrics
- CTA navigates to /leaders

**Verification:**
```bash
cd apps/web && npm run dev
# Visit http://localhost:3000 — verify all sections render, Total Leaders shows 5
```

**Codex Prompt:**
> Implement home page at apps/web/app/page.tsx: Hero section with "CopyGuard Bond" title and "Arc-native social trading protection layer" tagline. WalletConnect component. 3 metric cards from GET /api/leaders: Total Leaders (count), Active Bonds (placeholder 0), Risk Alerts (0). "View Leaders" button linking to /leaders. Use shadcn/ui Card + Button. No wallet required for metrics.

---

## Task 10A: Leaders List + Leader Detail Read-Only UI

**Depends on:** Task 8
**Blocks:** Task 10B
**Track:** Frontend (C)

**Files:**
- Create: `apps/web/app/leaders/page.tsx`
- Create: `apps/web/app/leaders/[id]/page.tsx`
- Create: `apps/web/components/leader-card.tsx`
- Create: `apps/web/components/risk-card.tsx`
- Create: `apps/web/hooks/use-leaders.ts`

- [ ] **Step 1: Write hooks/use-leaders.ts**

TanStack Query hooks:
- `useLeaders()` → fetches `GET /api/leaders`
- `useLeader(id)` → fetches `GET /api/leaders/:id`
- `useRisk(id)` → fetches `GET /api/risk/:id`

- [ ] **Step 2: Write components/leader-card.tsx**

Card displaying: leader name, venue, risk score with color coding (green <3000, yellow 3000–7000, red >7000), action badge (FOLLOW green / REDUCE yellow / EXIT red), confidenceBps, link to `/leaders/[id]`.

- [ ] **Step 3: Write components/risk-card.tsx**

Card displaying: risk score progress bar (0-10000 with color gradient), action, confidence, free summary reason. Data from `useRisk`.

- [ ] **Step 4: Write app/leaders/page.tsx**

Page fetching leaders via `useLeaders()`, rendering grid of LeaderCards. Loading/error states.

- [ ] **Step 5: Write app/leaders/[id]/page.tsx — read-only**

Leader detail with:
- Leader profile section (name, venue, metric summary)
- RiskCard (risk score, action, confidence, free summary)
- Two placeholder disabled sections: "My Bond" and "Unlock Report" (grayed out with "Coming soon")

- [ ] **Step 6: Verify both pages**

```bash
cd apps/web && npm run dev
# Visit /leaders — see 5 leader cards
# Click a leader — see detail with risk card
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/leaders/ apps/web/components/leader-card.tsx apps/web/components/risk-card.tsx apps/web/hooks/use-leaders.ts
git commit -m "feat: leaders list page and read-only leader detail with risk card"
```

**Acceptance Criteria:**
- `/leaders` shows 5 leaders with risk scores (color-coded)
- Clicking a leader navigates to `/leaders/[id]`
- Detail page shows leader profile + risk card with free summary
- Placeholder bond/report sections visible but disabled
- No wallet interaction needed for read-only viewing

**Verification:**
```bash
cd apps/web && npm run dev
# Visit http://localhost:3000/leaders — verify 5 cards
# Click any leader — verify detail page with risk data
```

**Codex Prompt:**
> Implement two pages in apps/web/:
> 1. app/leaders/page.tsx — fetch GET /api/leaders, render grid of LeaderCards. Each card: name, venue, riskScoreBps (color-coded: green<3000, yellow 3000-7000, red>7000), action badge (FOLLOW/REDUCE/EXIT), confidenceBps, link to /leaders/[id].
> 2. app/leaders/[id]/page.tsx — fetch GET /api/leaders/:id and GET /api/risk/:id. Show: leader profile (name, venue, metrics summary), RiskCard (riskScoreBps progress bar, action, confidence, free summary reason). Placeholder disabled sections for "My Bond" and "Unlock Report".
> 3. components/leader-card.tsx, components/risk-card.tsx
> 4. hooks/use-leaders.ts — TanStack Query hooks
> Use shadcn/ui Card, Badge. No wallet interaction needed for read-only.

---

## Task 10B: BondCreateModal + MyBondCard

**Depends on:** Task 10A + Task 4 (deployed contracts)
**Blocks:** Task 10C
**Track:** Frontend (C)

**Files:**
- Create: `apps/web/components/bond-create-modal.tsx`
- Create: `apps/web/components/bond-card.tsx`
- Create: `apps/web/hooks/use-bonds.ts`
- Modify: `apps/web/app/leaders/[id]/page.tsx`

- [ ] **Step 1: Write hooks/use-bonds.ts**

wagmi contract read hooks:
- `useUserBonds(userAddress)` — reads bonds from BondVault (iterate bond IDs or use event-based lookup)
- `useBondEvents()` — watches for BondCreated events for current user

- [ ] **Step 2: Write components/bond-create-modal.tsx**

Modal dialog with:
- Amount input (USDC, converted to 18-decimal BigInt)
- riskThresholdBps number input (default 7000)
- Expiry preset (30 days from now, displayed as timestamp)
- Submit button calls `CopyGuardBondVault.createBond(leaderId, thresholdBps, expiry)` via wagmi `useWriteContract`, msg.value = amount
- States: idle → confirming → pending → confirmed/failed
- Shows tx hash on success

- [ ] **Step 3: Write components/bond-card.tsx**

Card showing user's bond for this leader:
- State badge: Active (green), Warned (yellow), Slashed (red), Refunded (blue), Settled (gray)
- Amount formatted as USDC
- Threshold BPS
- Last risk score
- Report hash (truncated, copyable)
- Expiry countdown
- Only shown if user has a bond for this leader

- [ ] **Step 4: Update app/leaders/[id]/page.tsx**

Replace placeholder bond section with:
- If connected: show BondCreateModal button + MyBondCard
- If disconnected: show "Connect wallet to create bonds" prompt
- After bond creation tx confirmed, refetch bond data

- [ ] **Step 5: Verify bond creation flow**

```bash
cd apps/web && npm run dev
# Connect wallet (must have Arc Testnet USDC)
# Navigate to a leader detail
# Create bond with 1 USDC, threshold 7000, 30-day expiry
# Verify tx succeeds on Arcscan
# Verify MyBondCard shows Active state
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/bond-create-modal.tsx apps/web/components/bond-card.tsx apps/web/hooks/use-bonds.ts apps/web/app/leaders/
git commit -m "feat: bond creation modal and my bond card with Arc contract interaction"
```

**Acceptance Criteria:**
- Connected wallet can create bond (amount + threshold + expiry)
- createBond tx succeeds on Arc Testnet (msg.value = USDC amount)
- MyBondCard shows bond state after creation (Active)
- Disconnected wallet shows connect prompt
- Bond amount sent as native msg.value (no ERC-20 approval)

**Verification:**
```bash
cd apps/web && npm run dev
# Connect wallet → navigate to leader → create bond → check Arcscan for BondCreated event → verify MyBondCard shows Active
```

**Codex Prompt:**
> Add bond creation and display to apps/web/leader detail page:
> 1. components/bond-create-modal.tsx — form with amount (USDC, 18 decimals), riskThresholdBps (number input, e.g. 7000), expiry (preset 30 days from now). Submit calls CopyGuardBondVault.createBond via wagmi useWriteContract with msg.value = amount. Show tx pending/confirmed/success states.
> 2. components/bond-card.tsx — display user's bond for this leader: state badge (Active=green, Warned=yellow, Slashed=red, Refunded=blue, Settled=gray), amount (formatted USDC), threshold, lastRiskScore, reportHash (truncated with copy), expiry countdown.
> 3. hooks/use-bonds.ts — wagmi contract reads for user's bonds
> 4. Update leaders/[id]/page.tsx — show BondCreateModal button + MyBondCard. Require wallet connection.
> Bond amount sent as msg.value (native USDC on Arc). No ERC-20 approval needed.

---

## Task 10C: ReportPaywall + x402 Unlock Flow

**Depends on:** Task 10B + Task 7 (x402 backend ready)
**Blocks:** Task 12
**Track:** Frontend (C)

**Files:**
- Create: `apps/web/components/report-paywall.tsx`
- Modify: `apps/web/app/leaders/[id]/page.tsx`

- [ ] **Step 1: Write components/report-paywall.tsx**

Component with three states:
1. **Free**: shows riskScore, action, confidence, 1 summary reason (from useRisk)
2. **Locked**: shows free data + "Unlock Full Report — 1 USDC" button
3. **Unlocked**: shows full degradation report with feature weights, AI rationale, report hash

x402 unlock flow handler:
1. Set state to "fetching"
2. `fetch('/api/reports/:leaderId')` → expect 402
3. Parse 402 response (price, contract address, etc.)
4. Set state to "paying"
5. Call `ReportPayment.purchaseReport(leaderId)` via wagmi useWriteContract, msg.value = 1e18
6. Wait for tx confirmation → get tx hash
7. Set state to "verifying"
8. Retry fetch with headers: `X-Payment-Tx-Hash: ${txHash}`, `X-Wallet-Address: ${address}`
9. If 200: set state to "unlocked", display full report
10. If 402: show verification error

Error states: payment failed (show tx error), verification failed (show retry button)

- [ ] **Step 2: Update app/leaders/[id]/page.tsx**

Replace placeholder "Unlock Report" section with ReportPaywall component.
Position below RiskCard.

- [ ] **Step 3: Verify full x402 flow**

```bash
cd apps/web && npm run dev
# Connect wallet with Arc Testnet USDC
# Navigate to leader detail
# Click "Unlock Full Report"
# Verify: payment prompt → tx → verification → full report displayed
# Verify: Arcscan shows ReportPurchased event
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/report-paywall.tsx apps/web/app/leaders/
git commit -m "feat: x402 paid report paywall with on-chain payment verification"
```

**Acceptance Criteria:**
- Free summary visible without payment (riskScore, action, confidence, 1 reason)
- "Unlock Full Report" button triggers x402 payment flow
- ReportPayment.purchaseReport succeeds on Arc (msg.value = 1e18)
- Full report displays after payment verification
- Loading states shown: fetching → paying → verifying
- Error states handled with retry option

**Verification:**
```bash
cd apps/web && npm run dev
# Navigate to leader → click Unlock → pay 1 USDC → verify full report appears
# Check Arcscan for ReportPurchased event
```

**Codex Prompt:**
> Add x402 paid report unlock to apps/web/leader detail page:
> 1. components/report-paywall.tsx — Shows free summary (riskScore, action, confidence, 1 reason) and "Unlock Full Report — 1 USDC" button. x402 flow: click → fetch GET /api/reports/:leaderId → receive 402 → show payment prompt → call ReportPayment.purchaseReport(leaderId) via wagmi useWriteContract with msg.value=1e18 → wait tx confirmation → retry fetch with X-Payment-Tx-Hash and X-Wallet-Address headers → display full report (degradation analysis, feature weights, AI rationale, report hash). Loading states: fetching→paying→verifying→done. Error states: payment failed, verification failed.
> 2. Update leaders/[id]/page.tsx — integrate ReportPaywall component below RiskCard
> Requires wallet connection for payment.

---

## Task 11: Events Page

**Depends on:** Task 8
**Blocks:** Task 12
**Track:** Frontend (C)

**Files:**
- Create: `apps/web/app/events/page.tsx`
- Create: `apps/web/components/event-feed.tsx`
- Create: `apps/web/hooks/use-events.ts`

- [ ] **Step 1: Write hooks/use-events.ts**

Use viem `getLogs` to fetch events from:
- CopyGuardBondVault: BondCreated, RiskUpdated, BondWarned, BondSlashed, BondRefunded, BondSettled
- ReportPayment: ReportPurchased

TanStack Query hook with `refetchInterval: 5000` (5-second polling).
Decode each log using contract ABIs.

- [ ] **Step 2: Write components/event-feed.tsx**

- Filter tabs: All, Bonds (Created/Settled/Slashed/Refunded), Risk (Updated/Warned), Reports (ReportPurchased)
- Each event row: type icon (colored dot), event name, block number, tx hash (link to `testnet.arcscan.app/tx/...`), parameter summary (e.g., "Bond #1 created by 0x1234... for 1 USDC")
- Sorted by block number descending

- [ ] **Step 3: Write app/events/page.tsx**

Page with EventFeed component. Fetches on mount. Auto-refreshes every 5 seconds.

- [ ] **Step 4: Verify events page**

```bash
cd apps/web && npm run dev
# Create a bond (if not done yet)
# Navigate to /events
# Verify: BondCreated event shows with correct data
# Trigger risk check via backend
# Verify: RiskUpdated event appears within 5 seconds
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/events/ apps/web/components/event-feed.tsx apps/web/hooks/use-events.ts
git commit -m "feat: on-chain events page with auto-refresh and Arcscan links"
```

**Acceptance Criteria:**
- All emitted events displayed in /events
- Arcscan tx links work correctly
- Filter tabs filter events by type
- New events appear within 5 seconds (polling)
- Events sorted by block number (newest first)

**Verification:**
```bash
cd apps/web && npm run dev
# Create bond → check /events → trigger risk check → verify new events appear
```

**Codex Prompt:**
> Implement events page at apps/web/app/events/page.tsx:
> - Fetch events from CopyGuardBondVault and ReportPayment using viem getLogs
> - Display: BondCreated, RiskUpdated, BondWarned, BondSlashed, BondRefunded, BondSettled, ReportPurchased
> - Each event row: type icon/color, block number, tx hash (link to testnet.arcscan.app/tx/...), parameter summary (bondId, follower, amount, riskScore, etc.)
> - Filter tabs by event type (All, Bonds, Risk, Settlement, Reports)
> - Poll every 5 seconds via TanStack Query refetchInterval
> Create components/event-feed.tsx and hooks/use-events.ts.

---

## Task 12: Integration + README

**Depends on:** All previous tasks
**Blocks:** None (final task)
**Track:** Integration

**Files:**
- Create/Modify: `README.md`
- Verify: CORS config, API proxy, env files

- [ ] **Step 1: Verify CORS and API proxy**

- FastAPI `main.py`: CORS middleware allows `http://localhost:3000`
- `apps/web/next.config.js`: rewrites `/api/:path*` → `http://localhost:8000/api/:path*`
- Test: frontend fetches `/api/leaders` successfully through proxy

- [ ] **Step 2: Run full end-to-end demo flow**

1. Start all services:
   ```bash
   # Terminal 1: FastAPI
   cd agents/risk-worker && source .venv/bin/activate && uvicorn main:app --reload
   # Terminal 2: Next.js
   cd apps/web && npm run dev
   ```
2. Open http://localhost:3000
3. Connect Arc Testnet wallet
4. View 5 leaders on /leaders
5. Click a leader → view risk card + free summary
6. Click "Unlock Full Report" → pay 1 USDC → verify full report displays
7. Create bond (1 USDC, threshold 7000, 30-day expiry)
8. Trigger risk check: `curl -X POST http://localhost:8000/api/oracle/run-risk-check -H 'Content-Type: application/json' -d '{"leaderId":"hl_leader_03","bondId":1}'`
9. View /events → verify BondCreated, ReportPurchased, RiskUpdated events
10. Verify Arcscan shows all transactions

- [ ] **Step 3: Write README.md**

Sections (exact order):
1. **What it is** — One paragraph: Arc-native protection layer for social trading
2. **RFB Alignment** — RFB 06: Social Trading Intelligence
3. **Why Arc** — Bullet list: USDC gas, USDC bonds, sub-second settlement, low-cost risk updates, x402 paid reports, agentic economy roadmap
4. **Architecture** — Text diagram:
   ```
   User → Next.js Frontend → FastAPI Backend → Arc Testnet
                                   ↕
                          AI Risk Agent (scoring + LLM)
   ```
5. **Smart Contracts** — List: CopyGuardBondVault, LeaderRegistry, RiskOracleAdapter, ReportPayment
6. **Circle / Arc Usage** — Bullet list with specifics:
   - Arc Testnet deployment (chain 5042002)
   - USDC as native gas (all transactions)
   - USDC-denominated bonds via msg.value
   - x402-style paid report API (402 negotiation + Arc payment proof)
   - On-chain event monitoring (BondCreated, RiskUpdated, etc.)
7. **x402 Implementation** — Honest statement:
   ```
   P0 uses x402-compatible HTTP 402 negotiation with Arc native USDC onchain payment proof.
   Full x402 facilitator / nanopayments integration is P1.
   ```
8. **Run Locally** — Three startup commands:
   ```bash
   # Contracts (already deployed)
   # Backend
   cd agents/risk-worker && source .venv/bin/activate && uvicorn main:app --reload
   # Frontend
   cd apps/web && npm run dev
   ```
9. **Arcscan Links** — `https://testnet.arcscan.app` + specific contract addresses
10. **Demo Video** — Placeholder: `[Demo video link]`

- [ ] **Step 4: Final commit**

```bash
git add README.md
git commit -m "docs: add README with full project documentation and x402 honesty statement"
```

**Acceptance Criteria:**
- Full demo flow: connect wallet → leaders → risk → unlock report → create bond → risk check → events (all steps work)
- README complete with all 10 sections
- x402 honesty statement present and accurate
- 3 services start independently
- All Arcscan links functional

**Verification:**
```bash
# Start both services and manually walk through the complete demo flow
# Verify README renders correctly on GitHub
```

**Codex Prompt:**
> Finalize CopyGuard Bond integration and README:
> 1. Verify CORS in FastAPI allows localhost:3000
> 2. Verify next.config.js API rewrite proxies /api/* to FastAPI
> 3. Write README.md with sections: What it is, RFB 06 Social Trading Intelligence alignment, Why Arc, Architecture (text diagram showing User→Next.js→FastAPI→Arc), Smart Contracts (list 4 contracts), Circle/Arc Usage (Arc Testnet, USDC gas via msg.value, USDC bonds, x402-style paid reports, event monitoring), Run Locally (3 service commands), x402 honesty statement: "P0 uses x402-compatible HTTP 402 negotiation with Arc native USDC onchain payment proof. Full x402 facilitator / nanopayments integration is P1.", Arcscan links, Demo Video placeholder.
> Do NOT add new features.

---

## Summary: Critical Path and Parallelism

```
Day 1:  Task 1 (Scaffold) → Task 2 (Contracts) | Task 5 (Backend) | Task 8 (Frontend)
Day 2:  Task 3 (Tests)     | Task 6 (LLM)      | Task 9 (Home) + Task 10A (Leaders)
Day 3:  Task 4 (Deploy)    |                    | Task 10B (Bonds, after Task 4)
Day 4:  Task 7 (x402 + Chain, after Task 4 + Task 6)
Day 5:  Task 10C (Report Paywall, after Task 7) | Task 11 (Events)
Day 6:  Task 12 (Integration + README)
Day 7:  Buffer: demo video, polish, bug fixes
```

**Critical path:** Task 1 → Task 2 → Task 3 → Task 4 → Task 7 → Task 10C → Task 12

**Max parallelism at Day 1-2:**
- 3 tracks running simultaneously
- Backend can advance to Task 6 without waiting for contracts
- Frontend can advance to Task 10A without waiting for contracts
- Only Task 7 and Task 10B need deployed contracts (Task 4)
