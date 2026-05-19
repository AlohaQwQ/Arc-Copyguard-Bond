# Task 1: Repo Scaffold — Codex Prompt

> 将以下内容完整粘贴给 Codex 执行。

---

你正在为 CopyGuard Bond 项目创建 monorepo scaffold。项目根目录是当前工作目录。请按以下步骤执行，不要遗漏任何步骤。

## Step 1: 根目录配置

创建根目录 `package.json`：
```json
{
  "name": "copyguard-bond",
  "private": true,
  "workspaces": ["apps/*"]
}
```

创建 `.gitignore`：
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

初始化 git repo（如果还没有）：`git init`

## Step 2: Foundry contracts workspace

```bash
forge init contracts --no-git
cd contracts
forge install OpenZeppelin/openzeppelin-contracts
```

删除 contracts/src/ 和 contracts/test/ 中的默认 Counter.sol 和 Counter.t.sol 文件。

创建 `contracts/.env.example`：
```
# Arc Testnet
ARC_RPC_URL=https://rpc.testnet.arc.network
DEPLOYER_PRIVATE_KEY=your_deployer_private_key_here
```

验证：`cd contracts && forge build` 必须成功。

## Step 3: Python agent workspace

创建目录 `agents/risk-worker/`。

创建 `agents/risk-worker/requirements.txt`：
```
fastapi>=0.115.0
uvicorn[standard]>=0.34.0
pydantic>=2.10.0
pydantic-settings>=2.7.0
python-dotenv>=1.0.0
httpx>=0.28.0
web3>=7.0.0
pycryptodome>=3.21.0
```

创建 `agents/risk-worker/.env.example`：
```
# LLM (optional — unset for deterministic fallback)
LLM_PROVIDER=        # "claude" | "openai" | "gemini" | unset
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

创建 `agents/risk-worker/main.py`：
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="CopyGuard Risk Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

创建 Python venv 并安装依赖：
```bash
cd agents/risk-worker
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
```

## Step 4: Next.js frontend workspace

```bash
cd apps
npx create-next-app@latest web --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
cd web
npx shadcn@latest init -d
```

创建 `apps/web/.env.example`：
```
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```

创建 `apps/web/next.config.js`（如果不存在则创建，如果存在则覆盖）：
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
```

验证：`cd apps/web && npm run build` 必须成功。

## Step 5: 根目录安装和最终验证

```bash
# 回到根目录
cd ../../..
npm install
```

验证三个 workspace 都能正常运行：
1. `cd contracts && forge build` — 成功
2. `cd agents/risk-worker && pip install -r requirements.txt` — 成功（如果还没装的话）
3. `cd apps/web && npm run build` — 成功

## 约束

- 不要写任何应用代码（合约逻辑、API 逻辑、UI 组件），只做 scaffold
- 不要修改 Foundry 生成的 foundry.toml（保持默认即可）
- 不要修改 Next.js 生成的默认页面内容
- 确保 .gitignore 包含所有三个 workspace 的构建产物和敏感文件
