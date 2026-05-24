继续当前 CopyGuard Bond 项目，不进入业务功能开发。



本任务是新增 Docker 部署文件，用于将项目部署到腾讯云新加坡 CVM，域名为：



aisurrender.cyou



部署目标：

\- 使用 Docker Compose 管理服务

\- 使用 Caddy 作为反向代理和自动 HTTPS

\- 前端 Next.js 运行在 web container:3000

\- 后端 FastAPI 运行在 api container:8000

\- 公网只暴露 80/443

\- /api/\* 请求由 Caddy 反代到 FastAPI

\- 其他请求由 Caddy 反代到 Next.js



当前项目结构：

\- 前端：apps/web

\- 后端：agents/risk-worker

\- 根目录 package.json 使用 npm workspaces

\- 前端已可通过 cd apps/web \&\& npm run build

\- 后端已可通过 uvicorn main:app 启动

\- 不要修改 contracts/

\- 不要修改 agents/risk-worker 业务逻辑

\- 不要修改 apps/web 业务逻辑

\- 不要修改 apps/web/next.config.js

\- 不要提交任何真实 .env、私钥、API key



\## 需要创建/修改的文件



请在项目根目录创建：



1\. Dockerfile.web

2\. Dockerfile.api

3\. docker-compose.yml

4\. Caddyfile

5\. .dockerignore

6\. .env.production.example

7\. docs/deployment/tencent-docker-deploy.md



如 .gitignore 中没有忽略生产环境 env 文件，可以追加忽略：

\- .env

\- .env.production

\- .env.local

\- apps/web/.env.local

\- agents/risk-worker/.env



不要创建真实 .env，不要写入真实私钥。



\## 1. Dockerfile.web 要求



目标：

\- 构建 Next.js 前端 apps/web

\- 使用 npm workspaces

\- 兼容根目录 package-lock.json

\- 构建时注入 NEXT\_PUBLIC\_\* 环境变量

\- 运行 npm run start -w web 或等价命令

\- 暴露 3000



要求：

\- 使用 node:22-alpine 或 node:24-alpine

\- 优先以 root workspace 安装依赖

\- 如果 package workspace name 是 web，则可以使用 npm run build -w web

\- 如果 -w web 不兼容，请使用 cd apps/web \&\& npm run build

\- 最终容器 CMD 启动 Next.js production server，监听 3000

\- 不使用 next export

\- 不修改 next.config.js



需要支持以下 build args / env：



NEXT\_PUBLIC\_APP\_URL=https://aisurrender.cyou

NEXT\_PUBLIC\_ARC\_RPC\_URL=https://rpc.testnet.arc.network

NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID

NEXT\_PUBLIC\_FASTAPI\_URL=https://aisurrender.cyou

NEXT\_PUBLIC\_BOND\_VAULT\_ADDRESS

NEXT\_PUBLIC\_REPORT\_PAYMENT\_ADDRESS

NEXT\_PUBLIC\_LEADER\_REGISTRY\_ADDRESS

NEXT\_PUBLIC\_RISK\_ORACLE\_ADAPTER\_ADDRESS



注意：

\- NEXT\_PUBLIC\_\* 会被打入前端 bundle，所以只允许放公开信息

\- 不允许把 ORACLE\_PRIVATE\_KEY / LLM\_API\_KEY 放入前端镜像环境

\- Dockerfile.web 不应复制任何 .env 文件



建议 Dockerfile.web 结构：

\- builder stage:

&#x20; - WORKDIR /app

&#x20; - COPY package.json package-lock.json ./

&#x20; - COPY apps/web/package.json ./apps/web/package.json

&#x20; - RUN npm ci

&#x20; - COPY apps/web ./apps/web

&#x20; - ARG/ENV 注入 NEXT\_PUBLIC\_\*

&#x20; - RUN npm run build -w web 或 cd apps/web \&\& npm run build

\- runner stage:

&#x20; - 可以为了简单稳定复制 builder 的 /app

&#x20; - ENV NODE\_ENV=production

&#x20; - EXPOSE 3000

&#x20; - CMD 启动 web app



优先保证部署成功，不追求极致镜像体积。



\## 2. Dockerfile.api 要求



目标：

\- 构建 FastAPI backend

\- 路径 agents/risk-worker

\- 暴露 8000

\- 启动 uvicorn main:app --host 0.0.0.0 --port 8000



要求：

\- 使用 python:3.11-slim 或 python:3.12-slim

\- COPY agents/risk-worker/requirements.txt

\- RUN pip install --no-cache-dir -r requirements.txt

\- COPY agents/risk-worker ./

\- 不复制 .env

\- 后端配置全部从 docker-compose environment 注入



CMD：



python -m uvicorn main:app --host 0.0.0.0 --port 8000



\## 3. docker-compose.yml 要求



创建 3 个 service：



\### caddy



image: caddy:2-alpine



要求：

\- restart: unless-stopped

\- ports:

&#x20; - "80:80"

&#x20; - "443:443"

\- volumes:

&#x20; - ./Caddyfile:/etc/caddy/Caddyfile:ro

&#x20; - caddy\_data:/data

&#x20; - caddy\_config:/config

\- depends\_on:

&#x20; - web

&#x20; - api



\### web



要求：

\- build context: .

\- dockerfile: Dockerfile.web

\- restart: unless-stopped

\- expose:

&#x20; - "3000"

\- depends\_on:

&#x20; - api

\- build args 包含所有 NEXT\_PUBLIC\_\* 变量

\- environment 也包含所有 NEXT\_PUBLIC\_\* 变量和 NODE\_ENV=production



前端 build args / environment 至少包含：



NEXT\_PUBLIC\_APP\_URL=${NEXT\_PUBLIC\_APP\_URL}

NEXT\_PUBLIC\_ARC\_RPC\_URL=${NEXT\_PUBLIC\_ARC\_RPC\_URL}

NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID=${NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID}

NEXT\_PUBLIC\_FASTAPI\_URL=${NEXT\_PUBLIC\_FASTAPI\_URL}

NEXT\_PUBLIC\_BOND\_VAULT\_ADDRESS=${NEXT\_PUBLIC\_BOND\_VAULT\_ADDRESS}

NEXT\_PUBLIC\_REPORT\_PAYMENT\_ADDRESS=${NEXT\_PUBLIC\_REPORT\_PAYMENT\_ADDRESS}

NEXT\_PUBLIC\_LEADER\_REGISTRY\_ADDRESS=${NEXT\_PUBLIC\_LEADER\_REGISTRY\_ADDRESS}

NEXT\_PUBLIC\_RISK\_ORACLE\_ADAPTER\_ADDRESS=${NEXT\_PUBLIC\_RISK\_ORACLE\_ADAPTER\_ADDRESS}



\### api



要求：

\- build context: .

\- dockerfile: Dockerfile.api

\- restart: unless-stopped

\- expose:

&#x20; - "8000"

\- environment 包含后端运行变量：



ARC\_RPC\_URL=${ARC\_RPC\_URL}

BOND\_VAULT\_ADDRESS=${BOND\_VAULT\_ADDRESS}

RISK\_ORACLE\_ADAPTER\_ADDRESS=${RISK\_ORACLE\_ADAPTER\_ADDRESS}

REPORT\_PAYMENT\_ADDRESS=${REPORT\_PAYMENT\_ADDRESS}

LEADER\_REGISTRY\_ADDRESS=${LEADER\_REGISTRY\_ADDRESS}

ORACLE\_PRIVATE\_KEY=${ORACLE\_PRIVATE\_KEY}

LLM\_PROVIDER=${LLM\_PROVIDER}

LLM\_API\_KEY=${LLM\_API\_KEY}



注意：

\- ORACLE\_PRIVATE\_KEY 只允许出现在 api service

\- 不要把 ORACLE\_PRIVATE\_KEY 传给 web service

\- 不要在 docker-compose.yml 中硬编码真实私钥

\- volumes 包含 caddy\_data 和 caddy\_config



\## 4. Caddyfile 要求



域名：



aisurrender.cyou



Caddyfile：



\- 开启 gzip/zstd

\- /api/\* 反代到 api:8000

\- 其他路径反代到 web:3000

\- 不要使用 handle\_path /api/\*，避免错误剥离 /api 前缀

\- 使用 handle /api/\* 保留原始路径



示例结构：



aisurrender.cyou {

&#x20;   encode zstd gzip



&#x20;   handle /api/\* {

&#x20;       reverse\_proxy api:8000

&#x20;   }



&#x20;   handle {

&#x20;       reverse\_proxy web:3000

&#x20;   }

}



可选：

\- 同时支持 www.aisurrender.cyou，但如果没有 DNS 解析，不要强行加。

\- 不需要手写证书路径，Caddy 会自动申请 HTTPS。



\## 5. .dockerignore 要求



创建 .dockerignore，至少忽略：



.git

node\_modules

apps/web/node\_modules

apps/web/.next

.next

contracts/cache

contracts/out

contracts/broadcast

agents/risk-worker/.venv

agents/risk-worker/\_\_pycache\_\_

\_\_pycache\_\_

\*.pyc

.env

.env.local

.env.production

apps/web/.env.local

agents/risk-worker/.env

.DS\_Store

dist

coverage

npm-debug.log

pnpm-lock.yaml

yarn.lock



注意：

\- 不要忽略 package-lock.json

\- 不要忽略 package.json

\- 不要忽略 apps/web/package.json

\- 不要忽略 requirements.txt



\## 6. .env.production.example 要求



创建 .env.production.example，包含所有部署所需变量，但不要填真实私钥。



内容示例：



\# Public frontend config

NEXT\_PUBLIC\_APP\_URL=https://aisurrender.cyou

NEXT\_PUBLIC\_FASTAPI\_URL=https://aisurrender.cyou

NEXT\_PUBLIC\_ARC\_RPC\_URL=https://rpc.testnet.arc.network

NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID=your\_reown\_project\_id



\# Public contract addresses for frontend

NEXT\_PUBLIC\_BOND\_VAULT\_ADDRESS=0x822bBEF75F14744d11BaC553997Bd908dBE49B47

NEXT\_PUBLIC\_REPORT\_PAYMENT\_ADDRESS=0x15832FA84424E257ACf3735e905E9a5d3B33ee82

NEXT\_PUBLIC\_LEADER\_REGISTRY\_ADDRESS=0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967

NEXT\_PUBLIC\_RISK\_ORACLE\_ADAPTER\_ADDRESS=0x63109ECE16d78A5cEc5499F7f154e107549f7965



\# Backend config

ARC\_RPC\_URL=https://rpc.testnet.arc.network

BOND\_VAULT\_ADDRESS=0x822bBEF75F14744d11BaC553997Bd908dBE49B47

REPORT\_PAYMENT\_ADDRESS=0x15832FA84424E257ACf3735e905E9a5d3B33ee82

LEADER\_REGISTRY\_ADDRESS=0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967

RISK\_ORACLE\_ADAPTER\_ADDRESS=0x63109ECE16d78A5cEc5499F7f154e107549f7965



\# Optional LLM

LLM\_PROVIDER=

LLM\_API\_KEY=



\# Backend only. Never expose to frontend. Do not commit real value.

ORACLE\_PRIVATE\_KEY=



注意：

\- 服务器部署时用户会复制 .env.production.example 为 .env

\- docker-compose 会读取根目录 .env

\- 不要把真实 .env 提交到 git



\## 7. docs/deployment/tencent-docker-deploy.md 要求



创建部署文档，内容包括：



\### 腾讯云 CVM 准备



建议：

\- 地域：新加坡

\- 系统：Ubuntu 22.04 或 24.04

\- 安全组开放：

&#x20; - 22

&#x20; - 80

&#x20; - 443

\- 不要开放 3000 / 8000



\### DNS 配置



域名：



aisurrender.cyou



添加 A 记录：



aisurrender.cyou -> 腾讯云 CVM 公网 IP



如果要支持 www：



www.aisurrender.cyou -> 同一个公网 IP



但 Caddyfile 默认只配置 aisurrender.cyou。



\### 安装 Docker



写出 Ubuntu 上安装 Docker 的简要命令或提示用户按 Docker 官方文档安装。



至少包含验证命令：



docker version

docker compose version



\### 部署步骤



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



\### 更新部署



包含：



git pull

docker compose build

docker compose up -d



\### 验收 URL



列出：



https://aisurrender.cyou/

https://aisurrender.cyou/leaders

https://aisurrender.cyou/leaders/hl\_leader\_03

https://aisurrender.cyou/events

https://aisurrender.cyou/api/reports/hl\_leader\_03



\### 线上验收 checklist



包含：



\- 首页可打开

\- /leaders 可展示 leader

\- /leaders/hl\_leader\_03 可展示 RiskCard / MyBondCard / ReportPaywall

\- /api/reports/hl\_leader\_03 不带 headers 返回 402

\- 成功 payment txHash + wallet headers 可以返回完整 report

\- 钱包连接正常

\- createBond 不受影响

\- Full Risk Report 可解锁

\- /events 不崩溃

\- Caddy HTTPS 证书正常



\### 常见问题



至少写：

\- Caddy 申请证书失败：检查 DNS / 80 / 443

\- 前端 env 不生效：NEXT\_PUBLIC\_\* 改动后需要 docker compose build web

\- API 404 或 502：检查 api logs 和 Caddy 反代

\- ReportPayment contract not configured：检查 .env 中 REPORT\_PAYMENT\_ADDRESS 是否为空或重复

\- 钱包连接失败：检查 NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID

\- 不要提交 .env / 私钥



\## 8. 验证要求



Codex 完成后请运行：



1\. 检查 Docker Compose 配置：



docker compose config



如果本地未安装 Docker，可说明未运行。



2\. 检查前端 build 是否仍通过：



cd apps/web \&\& npm run build



3\. 检查 git diff 范围：



git diff --stat



预期只包含：

\- Dockerfile.web

\- Dockerfile.api

\- docker-compose.yml

\- Caddyfile

\- .dockerignore

\- .env.production.example

\- docs/deployment/tencent-docker-deploy.md

\- 可能的 .gitignore



不得包含：

\- contracts/

\- agents/risk-worker 业务代码

\- apps/web 业务代码

\- next.config.js

\- package.json 依赖变更，除非明确说明必要原因



\## 9. 输出要求



完成后输出：



1\. 创建/修改了哪些文件

2\. 每个文件用途

3\. 是否运行 docker compose config

4\. 是否运行 cd apps/web \&\& npm run build

5\. 是否确认未修改业务代码

6\. 部署到腾讯云服务器时的下一步命令摘要

7\. 需要用户手动填写的 .env 字段，尤其：

&#x20;  - NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID

&#x20;  - ORACLE\_PRIVATE\_KEY，如需要后端链上 oracle submit

&#x20;  - LLM\_API\_KEY，如需要 LLM

