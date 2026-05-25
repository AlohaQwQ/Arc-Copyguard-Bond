# CopyGuard Bond：Docker 部署执行 Prompt

> - `Dockerfile.web` 必须显式设置 `HOSTNAME=0.0.0.0` 和 `PORT=3000`
> - 必须先读取 `package.json` 与 `apps/web/package.json`，确认真实 workspace name，不要猜测 `npm -w` 参数
> - `docker compose config` 优先使用 `docker compose --env-file .env.production.example config`
> - `ORACLE_PRIVATE_KEY` / `LLM_API_KEY` 只允许进入 `api` service，绝不能进入前端镜像或 `web` service
> - Caddy 必须使用 `handle /api/*`，不要使用 `handle_path /api/*`
> - 可为 `web` / `api` 增加简单 healthcheck，但不要为了 healthcheck 大幅增加复杂度
> - 明确检查 `.gitignore` / `.dockerignore`，防止真实 `.env`、私钥、API key 被提交
>

---

继续当前 CopyGuard Bond 项目，不进入业务功能开发。



本任务是新增 Docker 部署文件，用于将项目部署到腾讯云新加坡 CVM，域名为：



aisurrender.cyou



部署目标：

* 使用 Docker Compose 管理服务
* 使用 Caddy 作为反向代理和自动 HTTPS
* 前端 Next.js 运行在 web container:3000
* 后端 FastAPI 运行在 api container:8000
* 公网只暴露 80/443
* /api/* 请求由 Caddy 反代到 FastAPI
* 其他请求由 Caddy 反代到 Next.js



当前项目结构：

* 前端：apps/web
* 后端：agents/risk-worker
* 根目录 package.json 使用 npm workspaces
* 前端已可通过 cd apps/web && npm run build
* 后端已可通过 uvicorn main:app 启动
* 不要修改 contracts/
* 不要修改 agents/risk-worker 业务逻辑
* 不要修改 apps/web 业务逻辑
* 不要修改 apps/web/next.config.js
* 不要提交任何真实 .env、私钥、API key

## 0.1 先读取并确认当前项目配置

在编写 Docker 文件前，必须先读取：

```text
package.json
apps/web/package.json
apps/web/.env.example
agents/risk-worker/.env.example
README.md
```

确认：

1. 根目录 npm workspaces 配置
2. `apps/web/package.json` 中的 package name
3. `apps/web/package.json` 中是否有 `build` / `start` script
4. 是否可以使用 `npm run build -w <workspace-name>`
5. 是否可以使用 `npm run start -w <workspace-name>`
6. 如果 workspace 参数不可靠，则使用 `cd apps/web && npm run build` 和 `cd apps/web && npm run start`
7. `.env.example` 中当前已有的 env key
8. README 中的部署地址、合约地址和本地启动方式

不要猜测 workspace name。必须以实际文件为准。





## 需要创建/修改的文件



请在项目根目录创建：



1. Dockerfile.web

2. Dockerfile.api

3. docker-compose.yml

4. Caddyfile

5. .dockerignore

6. .env.production.example

7. docs/deployment/tencent-docker-deploy.md



如 .gitignore 中没有忽略生产环境 env 文件，可以追加忽略：

* .env
* .env.production
* .env.local
* apps/web/.env.local
* agents/risk-worker/.env



不要创建真实 .env，不要写入真实私钥。

检查 .gitignore / .dockerignore：

* 确认 `.env`、`.env.production`、`.env.local`、`apps/web/.env.local`、`agents/risk-worker/.env` 都不会被提交。
* `.dockerignore` 不得忽略 `package-lock.json`、`package.json`、`apps/web/package.json`、`agents/risk-worker/requirements.txt`。



## 1. Dockerfile.web 要求



目标：

* 构建 Next.js 前端 apps/web
* 使用 npm workspaces
* 兼容根目录 package-lock.json
* 构建时注入 NEXT_PUBLIC_* 环境变量
* 运行 npm run start -w web 或等价命令
* 暴露 3000
* 容器内必须显式监听 `0.0.0.0:3000`，建议设置 `ENV HOSTNAME=0.0.0.0` 和 `ENV PORT=3000`



要求：

* 使用 node:22-alpine 或 node:24-alpine
* 优先以 root workspace 安装依赖
* 必须读取 `apps/web/package.json` 确认真实 workspace name，不要猜测 `npm run build -w web` 一定可用
* 如果 package workspace name 是 web，则可以使用 npm run build -w web
* 如果 -w web 不兼容，请使用 cd apps/web && npm run build
* 最终容器 CMD 启动 Next.js production server，监听 3000
* 不使用 next export
* 不修改 next.config.js



需要支持以下 build args / env：



NEXT_PUBLIC_APP_URL=https://aisurrender.cyou

NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network

NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

NEXT_PUBLIC_FASTAPI_URL=https://aisurrender.cyou

NEXT_PUBLIC_BOND_VAULT_ADDRESS

NEXT_PUBLIC_REPORT_PAYMENT_ADDRESS

NEXT_PUBLIC_LEADER_REGISTRY_ADDRESS

NEXT_PUBLIC_RISK_ORACLE_ADAPTER_ADDRESS



注意：

* NEXT_PUBLIC_* 会被打入前端 bundle，所以只允许放公开信息
* 不允许把 ORACLE_PRIVATE_KEY / LLM_API_KEY 放入前端镜像环境
* Dockerfile.web 不应复制任何 .env 文件



建议 Dockerfile.web 结构：

* builder stage:

  - WORKDIR /app

  - COPY package.json package-lock.json ./

  - COPY apps/web/package.json ./apps/web/package.json

  - RUN npm ci

  - COPY apps/web ./apps/web

  - ARG/ENV 注入 NEXT_PUBLIC_*

  - RUN npm run build -w web 或 cd apps/web && npm run build

* runner stage:

  - 可以为了简单稳定复制 builder 的 /app

  - ENV NODE_ENV=production
  - ENV HOSTNAME=0.0.0.0
  - ENV PORT=3000

  - EXPOSE 3000

  - CMD 启动 web app



优先保证部署成功，不追求极致镜像体积。



## 2. Dockerfile.api 要求



目标：

* 构建 FastAPI backend
* 路径 agents/risk-worker
* 暴露 8000
* 启动 uvicorn main:app --host 0.0.0.0 --port 8000



要求：

* 使用 python:3.11-slim 或 python:3.12-slim
* COPY agents/risk-worker/requirements.txt
* RUN pip install --no-cache-dir -r requirements.txt
* COPY agents/risk-worker ./
* 不复制 .env
* 后端配置全部从 docker-compose environment 注入



CMD：



python -m uvicorn main:app --host 0.0.0.0 --port 8000



## 3. docker-compose.yml 要求



创建 3 个 service：



### caddy



image: caddy:2-alpine



要求：

* restart: unless-stopped
* ports:

  - "80:80"

  - "443:443"

* volumes:

  - ./Caddyfile:/etc/caddy/Caddyfile:ro

  - caddy_data:/data

  - caddy_config:/config

* depends_on:

  - web

  - api



### web



要求：

* build context: .
* dockerfile: Dockerfile.web
* restart: unless-stopped
* expose:

  - "3000"

* depends_on:

  - api

* build args 包含所有 NEXT_PUBLIC_* 变量
* environment 也包含所有 NEXT_PUBLIC_* 变量和 NODE_ENV=production



前端 build args / environment 至少包含：



NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

NEXT_PUBLIC_ARC_RPC_URL=${NEXT_PUBLIC_ARC_RPC_URL}

NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID}

NEXT_PUBLIC_FASTAPI_URL=${NEXT_PUBLIC_FASTAPI_URL}

NEXT_PUBLIC_BOND_VAULT_ADDRESS=${NEXT_PUBLIC_BOND_VAULT_ADDRESS}

NEXT_PUBLIC_REPORT_PAYMENT_ADDRESS=${NEXT_PUBLIC_REPORT_PAYMENT_ADDRESS}

NEXT_PUBLIC_LEADER_REGISTRY_ADDRESS=${NEXT_PUBLIC_LEADER_REGISTRY_ADDRESS}

NEXT_PUBLIC_RISK_ORACLE_ADAPTER_ADDRESS=${NEXT_PUBLIC_RISK_ORACLE_ADAPTER_ADDRESS}



### api



要求：

* build context: .
* dockerfile: Dockerfile.api
* restart: unless-stopped
* expose:

  - "8000"

* environment 包含后端运行变量：



ARC_RPC_URL=${ARC_RPC_URL}

BOND_VAULT_ADDRESS=${BOND_VAULT_ADDRESS}

RISK_ORACLE_ADAPTER_ADDRESS=${RISK_ORACLE_ADAPTER_ADDRESS}

REPORT_PAYMENT_ADDRESS=${REPORT_PAYMENT_ADDRESS}

LEADER_REGISTRY_ADDRESS=${LEADER_REGISTRY_ADDRESS}

ORACLE_PRIVATE_KEY=${ORACLE_PRIVATE_KEY}

LLM_PROVIDER=${LLM_PROVIDER}

LLM_API_KEY=${LLM_API_KEY}



注意：

* ORACLE_PRIVATE_KEY 只允许出现在 api service
* 不要把 ORACLE_PRIVATE_KEY 传给 web service
* 不要在 docker-compose.yml 中硬编码真实私钥
* volumes 包含 caddy_data 和 caddy_config



## 4. Caddyfile 要求



域名：



aisurrender.cyou



Caddyfile：



* 开启 gzip/zstd
* /api/* 反代到 api:8000
* 其他路径反代到 web:3000
* 不要使用 handle_path /api/*，避免错误剥离 /api 前缀
* 使用 handle /api/* 保留原始路径



示例结构：



aisurrender.cyou {

    encode zstd gzip



    handle /api/* {

        reverse_proxy api:8000

    }



    handle {

        reverse_proxy web:3000

    }

}



可选：

* 同时支持 www.aisurrender.cyou，但如果没有 DNS 解析，不要强行加。
* 不需要手写证书路径，Caddy 会自动申请 HTTPS。



## 5. .dockerignore 要求



创建 .dockerignore，至少忽略：



.git

node_modules

apps/web/node_modules

apps/web/.next

.next

contracts/cache

contracts/out

contracts/broadcast

agents/risk-worker/.venv

agents/risk-worker/__pycache__

__pycache__

*.pyc

.env

.env.local

.env.production

apps/web/.env.local

agents/risk-worker/.env

.DS_Store

dist

coverage

npm-debug.log

pnpm-lock.yaml

yarn.lock



注意：

* 不要忽略 package-lock.json
* 不要忽略 package.json
* 不要忽略 apps/web/package.json
* 不要忽略 requirements.txt



## 6. .env.production.example 要求



创建 .env.production.example，包含所有部署所需变量，但不要填真实私钥。



内容示例：



# Public frontend config

NEXT_PUBLIC_APP_URL=https://aisurrender.cyou

NEXT_PUBLIC_FASTAPI_URL=https://aisurrender.cyou

NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network

NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_reown_project_id



# Public contract addresses for frontend

NEXT_PUBLIC_BOND_VAULT_ADDRESS=0x822bBEF75F14744d11BaC553997Bd908dBE49B47

NEXT_PUBLIC_REPORT_PAYMENT_ADDRESS=0x15832FA84424E257ACf3735e905E9a5d3B33ee82

NEXT_PUBLIC_LEADER_REGISTRY_ADDRESS=0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967

NEXT_PUBLIC_RISK_ORACLE_ADAPTER_ADDRESS=0x63109ECE16d78A5cEc5499F7f154e107549f7965



# Backend config

ARC_RPC_URL=https://rpc.testnet.arc.network

BOND_VAULT_ADDRESS=0x822bBEF75F14744d11BaC553997Bd908dBE49B47

REPORT_PAYMENT_ADDRESS=0x15832FA84424E257ACf3735e905E9a5d3B33ee82

LEADER_REGISTRY_ADDRESS=0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967

RISK_ORACLE_ADAPTER_ADDRESS=0x63109ECE16d78A5cEc5499F7f154e107549f7965



# Optional LLM

LLM_PROVIDER=

LLM_API_KEY=



# Backend only. Never expose to frontend. Do not commit real value.

ORACLE_PRIVATE_KEY=



注意：

* 服务器部署时用户会复制 .env.production.example 为 .env
* docker-compose 会读取根目录 .env
* 不要把真实 .env 提交到 git
* 不要出现重复 key。REPORT_PAYMENT_ADDRESS 只能出现一次，且不能是空值。



## 7. docs/deployment/tencent-docker-deploy.md 要求



创建部署文档，内容包括：



### 腾讯云 CVM 准备



建议：

* 地域：新加坡
* 系统：Ubuntu 22.04 或 24.04
* 安全组开放：

  - 22

  - 80

  - 443

* 不要开放 3000 / 8000



### DNS 配置



域名：



aisurrender.cyou



添加 A 记录：



aisurrender.cyou -> 腾讯云 CVM 公网 IP



如果要支持 www：



www.aisurrender.cyou -> 同一个公网 IP



但 Caddyfile 默认只配置 aisurrender.cyou。



### 安装 Docker



写出 Ubuntu 上安装 Docker 的简要命令或提示用户按 Docker 官方文档安装。



至少包含验证命令：



docker version

docker compose version



### 部署步骤



包含：



git clone <repo>

cd <repo>

cp .env.production.example .env

nano .env

docker compose build

docker compose up -d

docker compose ps

docker compose logs -f caddy

docker compose logs -f web

docker compose logs -f api



### 更新部署



包含：



git pull

docker compose build

docker compose up -d



### 验收 URL



列出：



https://aisurrender.cyou/

https://aisurrender.cyou/leaders

https://aisurrender.cyou/leaders/hl_leader_03

https://aisurrender.cyou/events

https://aisurrender.cyou/api/reports/hl_leader_03



### 线上验收 checklist



包含：



* 首页可打开
* /leaders 可展示 leader
* /leaders/hl_leader_03 可展示 RiskCard / MyBondCard / ReportPaywall
* /api/reports/hl_leader_03 不带 headers 返回 402
* 成功 payment txHash + wallet headers 可以返回完整 report
* 钱包连接正常
* createBond 不受影响
* Full Risk Report 可解锁
* /events 不崩溃
* Caddy HTTPS 证书正常



### 常见问题



至少写：

* Caddy 申请证书失败：检查 DNS / 80 / 443
* 前端 env 不生效：NEXT_PUBLIC_* 改动后需要 docker compose build web
* API 404 或 502：检查 api logs 和 Caddy 反代
* ReportPayment contract not configured：检查 .env 中 REPORT_PAYMENT_ADDRESS 是否为空或重复
* 钱包连接失败：检查 NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
* 不要提交 .env / 私钥



## 8. 验证要求



Codex 完成后请运行：



1. 检查 Docker Compose 配置：



docker compose --env-file .env.production.example config



如果本地未安装 Docker，可说明未运行。



2. 检查前端 build 是否仍通过：



cd apps/web && npm run build



3. 检查 git diff 范围：



git diff --stat



预期只包含：

* Dockerfile.web
* Dockerfile.api
* docker-compose.yml
* Caddyfile
* .dockerignore
* .env.production.example
* docs/deployment/tencent-docker-deploy.md
* 可能的 .gitignore



不得包含：

* contracts/
* agents/risk-worker 业务代码
* apps/web 业务代码
* next.config.js
* package.json 依赖变更，除非明确说明必要原因



## 9\. 输出要求



完成后输出：



1. 创建/修改了哪些文件

2. 每个文件用途

3. 是否运行 docker compose --env-file .env.production.example config

4. 是否运行 cd apps/web && npm run build

5. 是否确认未修改业务代码

6. 部署到腾讯云服务器时的下一步命令摘要

7. 需要用户手动填写的 .env 字段，尤其：

   - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

   - ORACLE_PRIVATE_KEY，如需要后端链上 oracle submit

   - LLM_API_KEY，如需要 LLM



## 10. 额外验收注意事项

Codex 输出时必须明确说明：

* 如果本地未安装 Docker，请明确说明未运行 compose config，不要假装通过。
* 如果 `docker compose --env-file .env.production.example config` 因占位空值失败，请说明原因，并给出需要用户填写的字段。
* `cd apps/web && npm run build` 必须真实运行并通过。
* `git diff --stat` 中不得出现业务代码变更。
* `ORACLE_PRIVATE_KEY` / `LLM_API_KEY` 不得出现在 `Dockerfile.web`、`web` service 或任何 `NEXT_PUBLIC_*` 配置中。

