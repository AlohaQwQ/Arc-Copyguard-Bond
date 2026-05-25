Docker 部署文件已由 Codex 生成，现在进行 Docker 部署任务验收。

本轮目标：验收 Docker deployment files。

不要进入 Codex execution。
不要修改业务代码。
不要修改 Docker 文件，除非发现明确阻塞问题并先输出原因。
不要创建真实 .env。
不要写入真实私钥或 API key。
不要 git add / commit / push。
不要更新 docs/superpowers/progress.md，除非我明确要求。
只允许读取和验证 Docker 部署相关文件。

## 必须验收的文件

请读取：

1. Dockerfile.web
2. Dockerfile.api
3. docker-compose.yml
4. Caddyfile
5. .dockerignore
6. .env.production.example
7. .gitignore
8. docs/deployment/tencent-docker-deploy.md
9. package.json
10. apps/web/package.json

必要时读取：

11. apps/web/.env.example
12. agents/risk-worker/.env.example
13. README.md


重点验收：

1. Caddyfile 域名必须是 aisurrender.cyou，不能拼错。
2. Caddyfile 必须使用 handle /api/*，不能使用 handle_path /api/*。
3. /api/* 必须反代到 api:8000。
4. 其他路径必须反代到 web:3000。
5. docker-compose.yml 必须包含 caddy / web / api 三个 service。
6. caddy 只暴露 80/443。
7. web 只 expose 3000，不直接暴露公网端口。
8. api 只 expose 8000，不直接暴露公网端口。
9. Dockerfile.web 必须显式设置 HOSTNAME=0.0.0.0 和 PORT=3000。
10. Dockerfile.web / web service 不得包含 ORACLE_PRIVATE_KEY。
11. Dockerfile.web / web service 不得包含 LLM_API_KEY。
12. ORACLE_PRIVATE_KEY 只能出现在 api service 或 .env.production.example 占位中。
13. LLM_API_KEY 只能出现在 api service 或 .env.production.example 占位中。
14. .env.production.example 不得包含真实私钥。
15. .env.production.example 不得包含真实 API key。
16. .env.production.example 不得有重复 key。
17. REPORT_PAYMENT_ADDRESS 只能出现一次，且不能为空。
18. NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID 应是占位值，不是真实敏感值。
19. .dockerignore 不得忽略 package-lock.json。
20. .dockerignore 不得忽略 package.json。
21. .dockerignore 不得忽略 apps/web/package.json。
22. .dockerignore 不得忽略 agents/risk-worker/requirements.txt。
23. .gitignore 必须忽略 .env / .env.production / .env.local / apps/web/.env.local / agents/risk-worker/.env。
24. docs/deployment/tencent-docker-deploy.md 必须包含腾讯云 CVM、安全组、DNS、Docker 安装、部署、更新、验收 URL、FAQ。
25. git diff 不得包含业务代码变更。

## 请运行命令

先查看状态：

```bash
git status --short
git diff --stat

检查禁止变更范围：

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

检查 docker compose 配置：
docker compose --env-file .env.production.example config

运行前端 build：
cd apps/web && npm run build

如果本地 Docker 可用，再运行：
docker compose --env-file .env.production.example build
docker compose --env-file .env.production.example up -d
docker compose ps
curl -i http://localhost/
curl -i http://localhost/api/reports/hl_leader_03

如果 Docker 不可用，请明确说明未运行，不要假装通过。


验收通过后输出：
Docker deployment files: PASS
Checklist: x/x
Build: PASS
Compose config: PASS
Business code diff: CLEAN
Remaining manual steps: fill real .env, DNS A record, deploy on Tencent CVM

验收输出格式请按以下结构输出：

Docker deployment files: PASS / FAIL

Checklist:

总项数：
通过项：
失败项：

验证结果：

docker compose config:
docker compose build:
npm run build:
local smoke test:
business code diff:

发现的问题：

如无问题，写 None
如有问题，列出文件、原因、最小修复建议

下一步：

fill real .env
configure DNS A record
deploy to Tencent Cloud CVM
verify https://aisurrender.cyou
