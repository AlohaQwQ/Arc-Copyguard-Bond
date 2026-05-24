# Task 12: Integration + README

## Context

You are working on **CopyGuard Bond**, an Arc Testnet P0 hackathon demo — an Arc-native protection layer for copy-trading followers.

**Project root**: `D:\Work\Development\AI\ClaudeCode\Agora`

Tasks 1–11 are COMPLETE and verified. This is the final task: **documentation and integration README only**. No new features, no business code changes.

---

## 1. Task 12 Scope

Task 12 is the final documentation and integration pass. Your job is to produce a high-quality `README.md` and ensure `.env.example` files are accurate, so that a reviewer or deployer can understand and run the project.

---

## 2. Allowed Modifications

You MAY create or modify ONLY these files:

| File | Action |
|---|---|
| `README.md` | **Create** (does not exist yet) |
| `apps/web/.env.example` | Review and update if env vars are missing or inaccurate |
| `agents/risk-worker/.env.example` | Review and update if env vars are missing or inaccurate |

---

## 3. Forbidden Modifications

You MUST NOT modify any of the following:

- `contracts/` — any file
- `agents/risk-worker/main.py`
- `agents/risk-worker/scoring.py`
- `agents/risk-worker/llm.py`
- `agents/risk-worker/x402.py`
- `agents/risk-worker/chain.py`
- `agents/risk-worker/mock_data.py`
- `agents/risk-worker/config.py`
- `agents/risk-worker/schemas.py`
- `agents/risk-worker/requirements.txt`
- `apps/web/app/` — any file
- `apps/web/components/` — any file
- `apps/web/hooks/` — any file
- `apps/web/lib/` — any file
- `apps/web/next.config.js`
- `apps/web/package.json`
- `package.json`
- `package-lock.json`
- `docs/superpowers/progress.md`
- `foundry.toml`
- `.gitignore`

---

## 4. README.md Structure

Create `README.md` at the project root with the following sections:

### 4.1 Title & One-liner

```
# CopyGuard Bond

Arc-native protection layer for copy-trading followers — P0 demo on Arc Testnet.
```

### 4.2 Project Overview

- CopyGuard Bond is a hackathon demo running on Arc Testnet (chainId: 5042002)
- Users can review copy-trading leader risk profiles, create protection bonds with Arc native USDC, unlock full AI risk reports via an x402-style payment flow, and track on-chain events
- This is a **demo / P0 prototype** for the Agora Agents hackathon
- **NOT** an insurance product, NOT financial advice, NOT guaranteed protection
- Protection bonds are a project design concept, NOT an Arc official concept
- **NOT** production-ready, NOT mainnet-deployed

### 4.3 Core Features

List the 6 implemented and verified capabilities:

1. **Leader Registry** — 5 demo leaders with deterministic risk scoring
2. **AI Risk Scoring** — rule-based scoring with optional LLM rationale and deterministic fallback
3. **Protection Bond Creation** — on-chain `createBond` with Arc native USDC (`msg.value`)
4. **My Bond Status** — read user's latest bond via multicall, real-time 5s refresh
5. **x402-style Report Unlock** — pay 1 USDC on-chain, backend verifies `ReportPurchased` event, unlocks full AI risk report
6. **On-chain Event Stream** — `getLogs` from 3 contracts, chunked reading, tab filter, 10s polling

### 4.4 Architecture

Describe the 3-layer architecture:

**Smart Contracts (Solidity ^0.8.24 + Foundry)**

| Contract | Address | Role |
|---|---|---|
| `CopyGuardBondVault` | `0x822bBEF75F14744d11BaC553997Bd908dBE49B47` | Bond lifecycle: create, risk update, warn, slash, refund, settle |
| `ReportPayment` | `0x15832FA84424E257ACf3735e905E9a5d3B33ee82` | 1 USDC per-report payment with duplicate protection |
| `RiskOracleAdapter` | `0x63109ECE16d78A5cEc5499F7f154e107549f7965` | Oracle whitelist + risk update forwarding to BondVault |
| `LeaderRegistry` | `0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967` | Leader registration and activation management |

All payments use **Arc native `msg.value`** (18 decimals USDC). No ERC-20 approvals.

**Backend (Python FastAPI)**

- `agents/risk-worker/` — lightweight FastAPI app
- 6 endpoints: `/health`, `/api/leaders`, `/api/leaders/{id}`, `/api/risk/{id}`, `/api/reports/{id}` (x402), `/api/oracle/run-risk-check`
- Deterministic risk scoring + optional LLM rationale
- x402 payment verification via `web3.py` receipt parsing
- Oracle chain submission via `submit_risk_update`

**Frontend (Next.js 15 + Reown AppKit + wagmi + viem)**

- 4 pages: `/`, `/leaders`, `/leaders/[id]`, `/events`
- Wallet connection via Reown AppKit (WalletConnect)
- On-chain interactions via wagmi `useWriteContract` / `useReadContracts`
- Event reading via viem `getLogs` with chunked block ranges (9999 block chunks, 120K lookback)
- Next.js rewrites proxy `/api/*` to FastAPI `localhost:8000`

### 4.5 Environment Variables

**Frontend** (`apps/web/.env.example`):

```env
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
NEXT_PUBLIC_BOND_VAULT_ADDRESS=0x822bBEF75F14744d11BaC553997Bd908dBE49B47
NEXT_PUBLIC_REPORT_PAYMENT_ADDRESS=0x15832FA84424E257ACf3735e905E9a5d3B33ee82
NEXT_PUBLIC_LEADER_REGISTRY_ADDRESS=0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967
NEXT_PUBLIC_RISK_ORACLE_ADAPTER_ADDRESS=0x63109ECE16d78A5cEc5499F7f154e107549f7965
```

**Backend** (`agents/risk-worker/.env.example`):

```env
# LLM (optional — unset for deterministic fallback)
LLM_PROVIDER=
LLM_API_KEY=

# Arc
ARC_RPC_URL=https://rpc.testnet.arc.network
ORACLE_PRIVATE_KEY=your_oracle_private_key_here

# Contract addresses (filled after deployment)
BOND_VAULT_ADDRESS=
RISK_ORACLE_ADAPTER_ADDRESS=
REPORT_PAYMENT_ADDRESS=
LEADER_REGISTRY_ADDRESS=
```

Note: env var names in README must match the actual `.env.example` files exactly. Do not invent new env vars.

### 4.6 Local Development

Include step-by-step instructions:

**Prerequisites**: Node.js 18+, Python 3.11+, Foundry (for contract builds only)

**Install dependencies**:

```bash
# Frontend (from project root)
npm install

# Backend
cd agents/risk-worker
pip install -r requirements.txt
```

**Start backend**:

```bash
cd agents/risk-worker
cp .env.example .env  # then fill in values
uvicorn main:app --reload --port 8000
```

**Start frontend**:

```bash
# From project root
cd apps/web
cp .env.example .env.local  # then fill in NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
npm run dev
```

**Build frontend**:

```bash
cd apps/web
npm run build
```

### 4.7 Demo Walkthrough

Include a numbered walkthrough:

1. Open `http://localhost:3000/` — landing page with project overview and wallet entry
2. Click **View Leaders** → navigate to `/leaders` — see 5 demo leader risk profiles
3. Click a leader card → navigate to `/leaders/hl_leader_03` — full leader detail with metrics and risk summary
4. Click **Connect Wallet** — Reown AppKit modal opens, connect to Arc Testnet
5. In **Create protection bond** section, enter amount and risk threshold → click **Create Bond** → confirm in wallet → wait for on-chain confirmation
6. Bond appears in **My Bond** card with state, amount, risk score, and Arcscan link
7. In **Full Risk Report** section, click **Unlock Full Report - 1 USDC** → confirm payment in wallet → backend verifies `ReportPurchased` event → full report with risk analysis, reasons, report hash
8. Navigate to `/events` — see `BondCreated`, `ReportPurchased`, `RiskUpdated` events from Arc Testnet with 10s auto-refresh
9. Click any tx hash → opens on Arcscan (`https://testnet.arcscan.app/tx/...`)

### 4.8 On-chain Verification

- All transactions are publicly verifiable on Arc Testnet: `https://testnet.arcscan.app`
- Bond creation: `CopyGuardBondVault.createBond` → `BondCreated` event
- Report payment: `ReportPayment.purchaseReport` → `ReportPurchased` event
- Risk updates: `RiskOracleAdapter.submitRiskUpdate` → `RiskUpdateForwarded` event
- Events page reads directly from Arc RPC via `getLogs`
- Contract addresses are in `contracts/deployments/arc-testnet.json` and hardcoded in `apps/web/lib/contracts.ts`

### 4.9 Known Limitations

Be explicit and honest:

- **Arc Testnet P0** — this is a hackathon demo, not mainnet
- **Deterministic mock data** — 5 demo leaders with rule-based scoring; LLM is optional
- **No real trading data** — all metrics and risk scores are synthetic
- **Bond lifecycle is partial** — `createBond` and `purchaseReport` are the primary user-facing flows; `slashBond`, `refundBond`, `settleBond` exist in contracts but are not exposed in the frontend UI
- **No production monitoring** — no logging, alerting, or uptime tracking
- **No user authentication** — wallet address is the only identity
- **Not financial advice** — risk scores are for demonstration only
- **Not insurance** — protection bonds are a project design concept, not a guarantee of any kind
- **Single-chain** — Arc Testnet only, no cross-chain support
- **No database** — leader data is hardcoded in `mock_data.py`

### 4.10 Tech Stack Summary

| Layer | Tech |
|---|---|
| Smart Contracts | Solidity ^0.8.24, Foundry, OpenZeppelin |
| Backend | Python FastAPI, web3.py, pycryptodome |
| Frontend | Next.js 15, React 19, Reown AppKit, wagmi, viem, Tailwind CSS 4 |
| Chain | Arc Testnet (chainId 5042002) |
| Payments | Arc native USDC via `msg.value`, 18 decimals |

### 4.11 Deployment Notes

Brief section:

- Backend and frontend can be deployed independently
- Backend: run `uvicorn main:app --host 0.0.0.0 --port 8000` with proper env vars
- Frontend: `npm run build && npm run start`, configure `NEXT_PUBLIC_*` env vars for production API URL
- For production, set up a reverse proxy (nginx/caddy) with HTTPS
- Docker packaging is recommended for future deployment but not included in this P0

---

## 5. .env.example Review

Check both `.env.example` files against the actual code:

**Frontend** (`apps/web/.env.example`):
- Verify all `NEXT_PUBLIC_*` vars used in `apps/web/lib/contracts.ts`, `apps/web/lib/arc.ts`, `apps/web/lib/wagmi.ts`, `apps/web/app/providers.tsx` are listed
- Verify contract addresses match `contracts/deployments/arc-testnet.json`
- If any var is missing, add it. If any address is wrong, update it.

**Backend** (`agents/risk-worker/.env.example`):
- Verify all env vars used in `agents/risk-worker/config.py` are listed
- Verify against `from config import settings` usage in `main.py`, `x402.py`, `chain.py`, `llm.py`
- If any var is missing, add it

Do NOT change env var names that already exist and work. Only add missing ones or fix clearly wrong values.

---

## 6. Language and Tone

- README should be in **English**
- Be factual and technical
- Do NOT use marketing language like "revolutionary", "cutting-edge", "world-class"
- Do NOT claim mainnet deployment, production readiness, or guaranteed outcomes
- Use "demo", "P0 prototype", "Arc Testnet" where appropriate
- Keep the README concise — aim for completeness over length

---

## 7. Verification Commands

After completing your changes, run:

```bash
cd apps/web && npm run build
```

This must pass without errors.

---

## 8. Git Diff Check

After completing your changes, run:

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

**Expected**:
- `README.md` shows changes (created)
- `.env.example` files may show changes (if updated)
- All forbidden paths show no output

---

## 9. Task 12 Acceptance Checklist

Verify ALL 30 items before reporting completion:

### README Content (16 items)

- [ ] 1. `README.md` exists at project root
- [ ] 2. Has "Project Overview" section
- [ ] 3. Has "Core Features" section listing all 6 capabilities
- [ ] 4. Has "Architecture" section with contracts, backend, frontend descriptions
- [ ] 5. Lists all 4 deployed contract addresses correctly
- [ ] 6. Has "Environment Variables" section for frontend
- [ ] 7. Has "Environment Variables" section for backend
- [ ] 8. Env var names match actual `.env.example` files exactly
- [ ] 9. Has "Local Development" section with install, start backend, start frontend, build commands
- [ ] 10. Has "Demo Walkthrough" section with numbered steps
- [ ] 11. Demo walkthrough includes `/leaders`
- [ ] 12. Demo walkthrough includes `/leaders/hl_leader_03`
- [ ] 13. Demo walkthrough includes `/events`
- [ ] 14. Has "On-chain Verification" section mentioning Arcscan
- [ ] 15. Has "Known Limitations" section
- [ ] 16. Has "Deployment Notes" section

### Language & Accuracy (8 items)

- [ ] 17. Does NOT claim mainnet deployment
- [ ] 18. Does NOT claim production ready
- [ ] 19. Does NOT claim or imply insurance
- [ ] 20. Does NOT claim guaranteed protection
- [ ] 21. Does NOT describe protection bonds as an Arc official concept
- [ ] 22. Explicitly states this is Arc Testnet P0 / hackathon demo
- [ ] 23. Known Limitations section is honest about mock data and partial lifecycle
- [ ] 24. README is written in English

### Technical Integrity (6 items)

- [ ] 25. `cd apps/web && npm run build` passes without errors
- [ ] 26. No changes in `contracts/`
- [ ] 27. No changes in `apps/web/app/`, `apps/web/components/`, `apps/web/hooks/`, `apps/web/lib/`
- [ ] 28. No changes in `agents/risk-worker/` source files (only `.env.example` allowed)
- [ ] 29. No changes to `package.json`, `package-lock.json`, or `next.config.js`
- [ ] 30. `docs/superpowers/progress.md` is NOT modified

---

## 10. Do NOT

- Write any business code
- Add new features
- Modify contracts
- Modify backend logic
- Modify frontend pages or components
- Modify `package.json` or `package-lock.json`
- Modify `docs/superpowers/progress.md`
- Create Docker files
- Create deployment scripts
- Run long-lived services
- Commit or push to git
- Claim mainnet / production readiness
- Claim insurance or guaranteed protection
- Describe protection bonds as an Arc official concept

---

## 11. Completion

When all checklist items pass, report:

```
Task 12 COMPLETE
README.md created
.env.example files reviewed
Build: PASS
Git diff: PASS (no forbidden changes)
Checklist: 30/30
```

If any item fails, report which items failed and why. Do NOT update `progress.md`.
