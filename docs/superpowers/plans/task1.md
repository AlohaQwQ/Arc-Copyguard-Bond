&#x20;Task 1: Repo Scaffold — 执行上下文



&#x20; 工作目录: D:\\Work\\Development\\AI\\ClaudeCode\\Agora

&#x20; 当前状态: 空项目，只有文档文件，无代码



&#x20; 你需要做的:

&#x20; 1. 进入项目根目录

&#x20; 2. 执行下面的 Codex prompt

&#x20; 3. 完成后回来，我会做验收



&#x20; ---

&#x20; Codex Prompt



&#x20; 将以下内容完整粘贴给 Codex：



&#x20; 你正在为 CopyGuard Bond 项目创建 monorepo scaffold。项目根目录是当前工作目录。请按以下步骤执行，不要遗漏任何步骤。



&#x20; ## Step 1: 根目录配置



&#x20; 创建根目录 `package.json`：

&#x20; ```json

&#x20; {

&#x20;   "name": "copyguard-bond",

&#x20;   "private": true,

&#x20;   "workspaces": \["apps/\*"]

&#x20; }



&#x20; 创建 .gitignore：

&#x20; node\_modules/

&#x20; .next/

&#x20; .env

&#x20; \_\_pycache\_\_/

&#x20; \*.pyc

&#x20; .venv/

&#x20; cache/

&#x20; out/

&#x20; broadcast/



&#x20; 初始化 git repo（如果还没有）：git init



&#x20; Step 2: Foundry contracts workspace



&#x20; 回到根目录

&#x20; cd D:\\Work\\Development\\AI\\ClaudeCode\\Agora



&#x20; cd contracts \&\& forge build

&#x20; forge install OpenZeppelin/openzeppelin-contracts



&#x20; 删除 Foundry 默认示例文件，如果文件不存在则忽略：

&#x20; - contracts/src/Counter.sol

&#x20; - contracts/test/Counter.t.sol

&#x20; - contracts/script/Counter.s.sol



&#x20; 创建 contracts/.env.example：

&#x20; # Arc Testnet

&#x20; ARC\_RPC\_URL=https://rpc.testnet.arc.network

&#x20; DEPLOYER\_PRIVATE\_KEY=your\_deployer\_private\_key\_here



&#x20; 验证：cd contracts \&\& forge build 必须成功。



&#x20; Step 3: Python agent workspace



&#x20; 回到根目录

&#x20; cd D:\\Work\\Development\\AI\\ClaudeCode\\Agora



&#x20; 创建目录 agents/risk-worker/。



&#x20; 创建 agents/risk-worker/requirements.txt：

&#x20; fastapi>=0.115.0

&#x20; uvicorn\[standard]>=0.34.0

&#x20; pydantic>=2.10.0

&#x20; pydantic-settings>=2.7.0

&#x20; python-dotenv>=1.0.0

&#x20; httpx>=0.28.0

&#x20; web3>=7.0.0

&#x20; pycryptodome>=3.21.0



&#x20; 创建 agents/risk-worker/.env.example：

&#x20; # LLM (optional — unset for deterministic fallback)

&#x20; LLM\_PROVIDER=        # "claude" | "openai" | "gemini" | unset

&#x20; LLM\_API\_KEY=



&#x20; # Arc

&#x20; ARC\_RPC\_URL=https://rpc.testnet.arc.network

&#x20; ORACLE\_PRIVATE\_KEY=your\_oracle\_private\_key\_here



&#x20; # Contract addresses (filled after deployment)

&#x20; BOND\_VAULT\_ADDRESS=

&#x20; RISK\_ORACLE\_ADAPTER\_ADDRESS=

&#x20; REPORT\_PAYMENT\_ADDRESS=

&#x20; LEADER\_REGISTRY\_ADDRESS=



&#x20; 创建 agents/risk-worker/main.py：

&#x20; from fastapi import FastAPI

&#x20; from fastapi.middleware.cors import CORSMiddleware



&#x20; app = FastAPI(title="CopyGuard Risk Agent")



&#x20; app.add\_middleware(

&#x20;     CORSMiddleware,

&#x20;     allow\_origins=\["http://localhost:3000"],

&#x20;     allow\_credentials=True,

&#x20;     allow\_methods=\["\*"],

&#x20;     allow\_headers=\["\*"],

&#x20; )



&#x20; @app.get("/health")

&#x20; async def health():

&#x20;     return {"status": "ok"}



&#x20; 创建 Python venv 并安装依赖：

&#x20; cd agents/risk-worker

&#x20; python -m venv .venv

&#x20; # Windows:

&#x20; .\\.venv\\Scripts\\python.exe -m pip install -r requirements.txt



&#x20; Step 4: Next.js frontend workspace



&#x20; 回到根目录

&#x20; cd D:\\Work\\Development\\AI\\ClaudeCode\\Agora



&#x20; cd apps

&#x20; npx create-next-app@latest web --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/\*"

&#x20; cd web

&#x20; npx shadcn@latest init -d



&#x20; 创建 apps/web/.env.example：

&#x20; NEXT\_PUBLIC\_ARC\_RPC\_URL=https://rpc.testnet.arc.network

&#x20; NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID=your\_project\_id\_here

&#x20; NEXT\_PUBLIC\_FASTAPI\_URL=http://localhost:8000



&#x20; 如果 apps/web 已存在 next.config.ts / next.config.mjs / next.config.js，请修改现有配置文件，不要创建重复配置文件。

&#x20; 如果没有配置文件，再创建 next.config.js：

&#x20; /\*\* @type {import('next').NextConfig} \*/

&#x20; const nextConfig = {

&#x20;   async rewrites() {

&#x20;     return \[

&#x20;       {

&#x20;         source: "/api/:path\*",

&#x20;         destination: "http://localhost:8000/api/:path\*",

&#x20;       },

&#x20;     ];

&#x20;   },

&#x20; };



&#x20; module.exports = nextConfig;



&#x20; 验证：cd apps/web \&\& npm run build 必须成功。



&#x20; Step 5: 根目录安装和最终验证



&#x20; # 回到根目录

&#x20; cd D:\\Work\\Development\\AI\\ClaudeCode\\Agora

&#x20; npm install



&#x20; 验证三个 workspace 都能正常运行：

&#x20; 1. cd contracts \&\& forge build — 成功

&#x20; 2. cd agents/risk-worker \&\& .\\.venv\\Scripts\\python.exe -m pip install -r requirements.txt — 成功（如果还没装的话）

&#x20; 3. cd apps/web \&\& npm run build — 成功



&#x20; 约束



&#x20; - 不要写任何应用代码（合约逻辑、API 逻辑、UI 组件），只做 scaffold

&#x20; - 不要修改 Foundry 生成的 foundry.toml（保持默认即可）

&#x20; - 不要修改 Next.js 生成的默认页面内容

&#x20; - 确保 .gitignore 包含所有三个 workspace 的构建产物和敏感文件



&#x20; ---



&#x20; ### 验收标准（Codex 完成后我会检查）



&#x20; | 检查项 | 验证命令 | 预期结果 |

&#x20; |---|---|---|

&#x20; | npm install 成功 | `npm install` | 无错误 |

&#x20; | Foundry 编译 | `cd contracts \&\& forge build` | 编译成功 |

&#x20; | Python 依赖安装 | `cd agents/risk-worker \&\& pip install -r requirements.txt` | 安装成功 |

&#x20; | Next.js 构建 | `cd apps/web \&\& npm run build` | 构建成功 |

&#x20; | .env.example 存在 | 检查 3 个文件 | 每个 workspace 各一个 |

&#x20; | .gitignore 完整 | 检查内容 | 包含 node\_modules, .next, \_\_pycache\_\_, .venv, .env 等 |

&#x20; | FastAPI hello world | `cd agents/risk-worker \&\& .\\.venv\\Scripts\\python.exe -c "from main import app; print('OK')"` | OK |

&#x20; | Next config proxy | 检查 next.config.ts / next.config.mjs / next.config.js | 包含 /api/ rewrite 到 localhost:8000 | 检查文件 | 包含 /api/ rewrite 到 localhost:8000 |



&#x20; 请执行这个 Codex prompt，完成后告诉我，我会逐项验收。



✻ Cooked for 1m 4s



&#x20; 1 tasks (0 done, 1 in progress, 0 open)

&#x20; ◼ Task 1: Repo Scaffold — Codex execution

