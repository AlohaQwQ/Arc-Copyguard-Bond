# Tencent Cloud CVM Docker Deployment

This guide deploys CopyGuard Bond to a Tencent Cloud CVM with Docker Compose and Caddy.

Target domain:

```text
aisurrender.cyou
```

Public ports:

- `80`
- `443`

Do not expose application ports `3000` or `8000` publicly.

## 1. CVM Preparation

Recommended setup:

- Region: Singapore
- OS: Ubuntu 22.04 or Ubuntu 24.04
- Security group inbound rules:
  - `22/tcp` for SSH
  - `80/tcp` for HTTP
  - `443/tcp` for HTTPS

## 2. DNS

Create an A record:

```text
aisurrender.cyou -> <Tencent Cloud CVM public IP>
```

Optional, only if DNS is configured:

```text
www.aisurrender.cyou -> <Tencent Cloud CVM public IP>
```

The default `Caddyfile` only configures `aisurrender.cyou`.

## 3. Install Docker

Use Docker's official Ubuntu installation instructions, then verify:

```bash
docker version
docker compose version
```

## 4. Initial Deployment

```bash
git clone <repo-url>
cd <repo>

cp .env.production.example .env
nano .env

docker compose build
docker compose up -d
docker compose ps
```

Useful logs:

```bash
docker compose logs -f caddy
docker compose logs -f web
docker compose logs -f api
```

## 5. Update Deployment

```bash
git pull
docker compose build
docker compose up -d
docker compose ps
```

If any `NEXT_PUBLIC_*` value changes, rebuild the `web` image:

```bash
docker compose build web
docker compose up -d web
```

## 6. Required `.env` Fields

Copy `.env.production.example` to `.env`, then fill this value before deploying:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_reown_project_id
```

Optional backend-only values:

```env
ORACLE_PRIVATE_KEY=
LLM_PROVIDER=
LLM_API_KEY=
```

Notes:

- `ORACLE_PRIVATE_KEY` is only needed when backend oracle chain submission is required.
- `LLM_API_KEY` is only needed when optional LLM rationale is enabled.
- Never commit `.env`, private keys, or API keys.

## 7. Verification URLs

Open:

- `https://aisurrender.cyou/`
- `https://aisurrender.cyou/leaders`
- `https://aisurrender.cyou/leaders/hl_leader_03`
- `https://aisurrender.cyou/events`
- `https://aisurrender.cyou/api/reports/hl_leader_03`

Expected API behavior:

- `GET /api/reports/hl_leader_03` without payment headers returns `402`.
- The same endpoint with a valid payment tx hash and wallet headers returns the full report.

## 8. Online Checklist

- Home page opens.
- `/leaders` shows leaders.
- `/leaders/hl_leader_03` shows RiskCard, MyBondCard, and ReportPaywall.
- `/api/reports/hl_leader_03` without headers returns `402`.
- A successful payment tx hash plus wallet headers returns the full report.
- Wallet connection works.
- `createBond` still works.
- Full Risk Report unlock works.
- `/events` loads without crashing.
- Caddy HTTPS certificate is valid.

## 9. Common Issues

### Caddy certificate request fails

Check DNS, security group rules for `80` / `443`, and whether another process is already using those ports.

### Frontend environment changes do not take effect

`NEXT_PUBLIC_*` variables are baked into the frontend build. Rebuild the web image:

```bash
docker compose build web
docker compose up -d web
```

### API returns 404 or 502

Check service logs:

```bash
docker compose logs -f api
docker compose logs -f caddy
```

Also confirm `Caddyfile` uses `handle /api/*`, not `handle_path /api/*`.

### ReportPayment contract is not configured

Check `.env`:

- `REPORT_PAYMENT_ADDRESS` is present.
- `REPORT_PAYMENT_ADDRESS` is not empty.
- `REPORT_PAYMENT_ADDRESS` appears only once.

Then restart:

```bash
docker compose up -d api
```

### Wallet connection fails

Check:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_reown_project_id
```

Then rebuild the frontend image.

### Do not commit secrets

Before committing deployment files, check:

```bash
git status --short
git diff --stat
```

Do not commit:

- `.env`
- private keys
- API keys
