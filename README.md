# CopyGuard Bond

Arc-native protection layer for copy-trading followers — P0 demo on Arc Testnet.

## Project Overview

CopyGuard Bond is an Agora Agents hackathon P0 prototype running on Arc Testnet (`chainId 5042002`).

The application lets users review copy-trading leader risk profiles, create protection bonds using Arc native USDC, unlock full AI risk reports through an x402-style payment flow, and inspect on-chain activity from deployed contracts.

Important scope notes:

- This is a demo / P0 prototype for the Agora Agents hackathon.
- It is **NOT** an insurance product.
- It is **NOT** financial advice.
- It is **NOT** guaranteed protection.
- Protection bonds are a CopyGuard Bond project concept, **NOT** an official Arc concept.
- It is **NOT** production-ready.
- It is **NOT** deployed on mainnet.

## Core Features

1. **Leader Registry** — 5 demo leaders with deterministic risk scoring.
2. **AI Risk Scoring** — rule-based scoring with optional LLM rationale and deterministic fallback.
3. **Protection Bond Creation** — on-chain `createBond` using Arc native USDC via `msg.value`.
4. **My Bond Status** — user bond state read through multicall with periodic refresh.
5. **x402-style Report Unlock** — 1 USDC on-chain payment, backend verification of the `ReportPurchased` event, and full AI risk report unlock.
6. **On-chain Event Stream** — `getLogs` reads from 3 contracts with chunked reading, tab filters, and 10-second polling.

## Architecture

### Smart Contracts

Solidity `^0.8.24` + Foundry + OpenZeppelin.

| Contract | Address | Role |
|---|---|---|
| `CopyGuardBondVault` | `0x822bBEF75F14744d11BaC553997Bd908dBE49B47` | Bond lifecycle: create, risk update, warn, slash, refund, settle |
| `ReportPayment` | `0x15832FA84424E257ACf3735e905E9a5d3B33ee82` | 1 USDC per-report payment with duplicate protection |
| `RiskOracleAdapter` | `0x63109ECE16d78A5cEc5499F7f154e107549f7965` | Oracle whitelist and risk update forwarding to BondVault |
| `LeaderRegistry` | `0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967` | Leader registration and activation management |

All payments use Arc native `msg.value` with 18-decimal USDC. There is no ERC-20 approval flow.

### Backend

Python FastAPI app in `agents/risk-worker/`.

Endpoints:

- `GET /health`
- `GET /api/leaders`
- `GET /api/leaders/{id}`
- `GET /api/risk/{id}`
- `GET /api/reports/{id}` with x402-style payment negotiation
- `POST /api/oracle/run-risk-check`

The backend provides deterministic risk scoring with optional LLM rationale, verifies x402-style report payments by parsing receipts with `web3.py`, and can submit oracle risk updates through `RiskOracleAdapter`.

### Frontend

Next.js 15 + React 19 + Reown AppKit + wagmi + viem.

Pages:

- `/`
- `/leaders`
- `/leaders/[id]`
- `/events`

The frontend connects wallets through Reown AppKit / WalletConnect, creates bonds with wagmi `useWriteContract`, reads user bond state with wagmi multicall, and reads event logs with viem `getLogs`. Event reads use 9,999-block chunks over a 120,000-block lookback.

Next.js rewrites proxy `/api/*` requests to the FastAPI service at `localhost:8000`.

## Environment Variables

### Frontend

`apps/web/.env.example`

```env
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BOND_VAULT_ADDRESS=0x822bBEF75F14744d11BaC553997Bd908dBE49B47
NEXT_PUBLIC_REPORT_PAYMENT_ADDRESS=0x15832FA84424E257ACf3735e905E9a5d3B33ee82
NEXT_PUBLIC_LEADER_REGISTRY_ADDRESS=0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967
NEXT_PUBLIC_RISK_ORACLE_ADAPTER_ADDRESS=0x63109ECE16d78A5cEc5499F7f154e107549f7965
```

### Backend

`agents/risk-worker/.env.example`

```env
# LLM (optional — unset for deterministic fallback)
LLM_PROVIDER=
LLM_API_KEY=

# Arc
ARC_RPC_URL=https://rpc.testnet.arc.network
ORACLE_PRIVATE_KEY=your_oracle_private_key_here

# Contract addresses
BOND_VAULT_ADDRESS=0x822bBEF75F14744d11BaC553997Bd908dBE49B47
RISK_ORACLE_ADAPTER_ADDRESS=0x63109ECE16d78A5cEc5499F7f154e107549f7965
REPORT_PAYMENT_ADDRESS=0x15832FA84424E257ACf3735e905E9a5d3B33ee82
LEADER_REGISTRY_ADDRESS=0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967
```

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.11+
- Foundry, only required for contract builds and tests

### Install dependencies

```bash
# From project root
npm install

# Backend
cd agents/risk-worker
pip install -r requirements.txt
```

### Start backend

```bash
cd agents/risk-worker
cp .env.example .env
# Fill ORACLE_PRIVATE_KEY if oracle chain submission is needed.
uvicorn main:app --reload --port 8000
```

### Start frontend

```bash
# From project root
cd apps/web
cp .env.example .env.local
# Fill NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.
npm run dev
```

### Build frontend

```bash
cd apps/web
npm run build
```

## Demo Walkthrough

1. Open `http://localhost:3000/` to view the landing page and wallet entry.
2. Click **View Leaders** to open `/leaders` and review the 5 demo leader risk profiles.
3. Open a leader card, such as `/leaders/hl_leader_03`, to inspect leader details, metrics, and the risk summary.
4. Click **Connect Wallet** to open the Reown AppKit modal and connect on Arc Testnet.
5. In **Create protection bond**, enter an amount and risk threshold, click **Create Bond**, confirm in the wallet, and wait for on-chain confirmation.
6. Review the latest bond in the **My Bond** card, including state, amount, risk score, and Arcscan link.
7. In **Full Risk Report**, click **Unlock Full Report - 1 USDC**, confirm the payment, let the backend verify the `ReportPurchased` event, and view the full report with reasons and report hash.
8. Open `/events` to review `BondCreated`, `ReportPurchased`, and `RiskUpdated` events from Arc Testnet with 10-second polling.
9. Click any transaction hash to open the corresponding Arcscan page at `https://testnet.arcscan.app/tx/...`.

## On-chain Verification

All user-facing transactions can be publicly checked on Arcscan: `https://testnet.arcscan.app`.

- Bond creation: `CopyGuardBondVault.createBond` emits `BondCreated`.
- Report payment: `ReportPayment.purchaseReport` emits `ReportPurchased`.
- Risk update: `RiskOracleAdapter.submitRiskUpdate` emits `RiskUpdateForwarded`.
- The events page reads logs directly from Arc RPC through `getLogs`.
- Contract address sources:
  - `contracts/deployments/arc-testnet.json`
  - `apps/web/lib/contracts.ts`

## Known Limitations

- **Arc Testnet P0** — this is a hackathon demo, not mainnet.
- **Deterministic mock data** — the 5 demo leaders use synthetic metrics and rule-based scoring; LLM rationale is optional.
- **No real trading data** — metrics and risk scores are not pulled from live exchanges.
- **Partial bond lifecycle UI** — `createBond` and `purchaseReport` are the primary user-facing flows; `slashBond`, `refundBond`, and `settleBond` exist in the contracts but are not exposed as frontend controls.
- **No production monitoring** — there is no operational logging, alerting, or uptime tracking.
- **No user authentication** — wallet address is the only identity.
- **Not financial advice** — risk scores are for demonstration only.
- **Not insurance** — protection bonds are a project design concept, not a guarantee.
- **Single-chain** — only Arc Testnet is supported.
- **No database** — leader data is hardcoded in `mock_data.py`.

## Tech Stack Summary

| Layer | Tech |
|---|---|
| Smart Contracts | Solidity ^0.8.24, Foundry, OpenZeppelin |
| Backend | Python FastAPI, web3.py, pycryptodome |
| Frontend | Next.js 15, React 19, Reown AppKit, wagmi, viem, Tailwind CSS 4 |
| Chain | Arc Testnet, chainId 5042002 |
| Payments | Arc native USDC via `msg.value`, 18 decimals |

## Deployment Notes

- Backend and frontend can be deployed independently.
- Backend:
  - Set the required environment variables.
  - Run `uvicorn main:app --host 0.0.0.0 --port 8000`.
- Frontend:
  - Set the production `NEXT_PUBLIC_*` environment variables.
  - Run `npm run build && npm run start`.
- Production-style hosting should use a reverse proxy such as nginx or Caddy and enable HTTPS.
- Docker packaging and VPS deployment are separate steps after Task 12.
