# Task 1: Repo Scaffold — Codex 执行上下文

**工作目录**：`D:\Work\Development\AI\ClaudeCode\Agora`  
**当前状态**：空项目，只有文档文件，无代码。  
**目标**：只创建 monorepo scaffold，不实现任何业务逻辑。

---

## 使用方式

在项目根目录打开 PowerShell：

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora
```

然后把下面的 **Codex Prompt** 完整粘贴给 Codex 执行。Codex 完成后，回到 Claude Code / Superpowers 进行 Task 1 验收。

---

# Codex Prompt

你正在为 **CopyGuard Bond** 项目创建 monorepo scaffold。项目根目录是：

```text
D:\Work\Development\AI\ClaudeCode\Agora
```

请严格按以下步骤执行。**不要遗漏步骤，不要实现业务代码。**

每个 Step 开始前，都先回到项目根目录，避免在错误子目录中创建文件：

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora
```

---

## Step 1: 根目录配置

回到项目根目录：

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora
```

如果当前目录还不是 git repo，初始化：

```powershell
git init
```

创建根目录 `package.json`：

```json
{
  "name": "copyguard-bond",
  "private": true,
  "workspaces": ["apps/*"]
}
```

创建根目录 `.gitignore`：

```gitignore
# Node / Next.js
node_modules/
.next/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment files
.env
.env.local
.env.*.local

# Python
__pycache__/
*.pyc
.venv/

# Foundry
cache/
out/
broadcast/

# OS / editor
.DS_Store
Thumbs.db
.vscode/
.idea/
```

注意：**不要忽略 `lib/`**，因为 Foundry/OpenZeppelin 依赖会放在 `contracts/lib/`。

---

## Step 2: Foundry contracts workspace

回到项目根目录：

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora
```

初始化 Foundry 项目：

```powershell
forge init contracts --no-git
```

安装 OpenZeppelin：

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora\contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

删除 Foundry 默认示例文件。如果文件不存在，则忽略：

```powershell
Remove-Item -ErrorAction SilentlyContinue .\src\Counter.sol
Remove-Item -ErrorAction SilentlyContinue .\test\Counter.t.sol
Remove-Item -ErrorAction SilentlyContinue .\script\Counter.s.sol
```

创建 `contracts/.env.example`：

```dotenv
# Arc Testnet
ARC_RPC_URL=https://rpc.testnet.arc.network
DEPLOYER_PRIVATE_KEY=your_deployer_private_key_here
```

从项目根目录验证 Foundry 编译：

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora\contracts
forge build
```

预期：`forge build` 成功。

---

## Step 3: Python FastAPI agent workspace

回到项目根目录：

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora
```

创建目录：

```powershell
New-Item -ItemType Directory -Force -Path .\agents\risk-worker
```

创建 `agents/risk-worker/requirements.txt`：

```txt
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

```dotenv
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

创建 Python venv 并安装依赖。不要依赖系统 `pip`，使用 venv 里的 Python：

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora\agents\risk-worker
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

验证 FastAPI app 可以被导入：

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora\agents\risk-worker
.\.venv\Scripts\python.exe -c "from main import app; print('OK')"
```

预期输出：

```text
OK
```

---

## Step 4: Next.js frontend workspace

回到项目根目录：

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora
```

创建 `apps` 目录：

```powershell
New-Item -ItemType Directory -Force -Path .\apps
```

初始化 Next.js 15 前端项目。请创建到 `apps/web`：

```powershell
npx create-next-app@latest apps/web --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
```

如果 `create-next-app` 出现交互式问题，请选择默认选项，但必须保持：
- TypeScript
- Tailwind
- ESLint
- App Router
- 不使用 `src/` 目录
- import alias 为 `@/*`

初始化 shadcn/ui：

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora\apps\web
npx shadcn@latest init -d
```

如果 `shadcn` 出现交互式问题，请选择默认选项。

创建 `apps/web/.env.example`：

```dotenv
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```

配置 Next.js API rewrite。

如果 `apps/web` 已存在以下任意配置文件，请修改**实际存在的那个文件**，不要创建重复配置文件：
- `next.config.ts`
- `next.config.mjs`
- `next.config.js`

如果没有配置文件，再创建 `next.config.js`。

### 如果是 `next.config.ts`

内容应包含：

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
```

### 如果是 `next.config.mjs`

内容应包含：

```js
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

export default nextConfig;
```

### 如果是 `next.config.js`

内容应包含：

```js
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

验证 Next.js 构建：

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora\apps\web
npm run build
```

预期：`npm run build` 成功。

---

## Step 5: 根目录安装和最终验证

回到项目根目录：

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora
```

安装根目录 npm workspace 依赖：

```powershell
npm install
```

执行最终验证：

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora\contracts
forge build
```

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora\agents\risk-worker
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -c "from main import app; print('OK')"
```

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora\apps\web
npm run build
```

---

## 约束

- 不要写任何应用代码，包括：
  - 合约业务逻辑
  - FastAPI 业务 API
  - 风险评分逻辑
  - x402 逻辑
  - 钱包连接逻辑
  - UI 业务组件
- 只做 scaffold。
- 不要修改 Foundry 生成的 `foundry.toml`，保持默认即可。
- 不要修改 Next.js 生成的默认页面内容。
- 不要创建重复的 Next config 文件。
- 不要忽略 `contracts/lib/`。
- 不要自动设置全局 git config。如果 git commit 因 user.name/user.email 未配置失败，只报告即可。
- 所有相对路径都以 `D:\Work\Development\AI\ClaudeCode\Agora` 为项目根目录计算。

---

## 验收标准

| 检查项 | 验证命令 / 检查方式 | 预期结果 |
|---|---|---|
| 根目录 package.json | `Get-Content package.json` | name 为 copyguard-bond，workspaces 为 `apps/*` |
| npm install | `npm install` | 无错误 |
| Foundry 编译 | `cd contracts && forge build` | 编译成功 |
| Python 依赖安装 | `cd agents/risk-worker && .\.venv\Scripts\python.exe -m pip install -r requirements.txt` | 安装成功 |
| FastAPI hello world | `cd agents/risk-worker && .\.venv\Scripts\python.exe -c "from main import app; print('OK')"` | 输出 OK |
| Next.js 构建 | `cd apps/web && npm run build` | 构建成功 |
| `.env.example` 存在 | 检查 `contracts/.env.example`、`agents/risk-worker/.env.example`、`apps/web/.env.example` | 三个文件都存在 |
| `.gitignore` 完整 | 检查根目录 `.gitignore` | 包含 node_modules、.next、__pycache__、.venv、.env、out、cache、broadcast |
| Foundry 默认示例已删除 | 检查 `contracts/src/Counter.sol`、`contracts/test/Counter.t.sol`、`contracts/script/Counter.s.sol` | 不存在 |
| Next config proxy | 检查 `apps/web/next.config.ts` / `next.config.mjs` / `next.config.js` 中实际存在的文件 | 包含 `/api/:path*` rewrite 到 `http://localhost:8000/api/:path*` |

---

## 完成后请返回

执行完成后，请输出：

1. 创建或修改的文件列表；
2. 哪些验证命令通过；
3. 哪些验证命令失败，以及失败原因；
4. 是否存在你无法自动处理、需要人工确认的事项。

不要继续执行 Task 2。
