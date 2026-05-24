# ClaudeCode / Superpowers：生成 Task 12 Integration + README 执行上下文 Prompt

\---

继续当前 Superpowers 工作流。

不要恢复工作流。  
不要重新读取无关历史文件。  
不要进入 Codex execution。  
不要直接修改业务代码。

本轮目标：生成 Task 12 Integration + README 的 Codex 执行 prompt，并保存到 `docs/superpowers/prompts/` 下。

\---

## 1\. 当前状态

项目：CopyGuard Bond P0 hackathon demo

当前已完成并验收通过：

* Task 1–7：合约、后端、x402、链上提交基础能力
* Task 8A：Next.js + Reown AppKit 钱包 + leaders + createBond 最小闭环
* Task 10B：MyBondCard，读取并展示用户 bond 状态
* Task 10C：ReportPaywall，ReportPayment + x402-style unlock full report
* Task 11：Events Page，真实读取 Arc Testnet getLogs 事件流
* Task 9B：Home Page Demo Polish，首页已正式产品化

当前 `progress.md` 显示 P0 仅剩：

* Task 12: Integration + README

\---

## 2\. 需要读取的文件

只读取必要文件：

1. `docs/superpowers/progress.md`
2. `docs/superpowers/plans/copyguard-bond-p0-execution-plan.md`
3. `README.md`（如果存在）
4. `apps/web/package.json`
5. `package.json`
6. `apps/web/.env.example`
7. `agents/risk-worker/.env.example`
8. `apps/web/app/page.tsx`
9. `apps/web/app/leaders/\[id]/page.tsx`
10. `apps/web/app/events/page.tsx`

如果 `README.md` 不存在，请在 Task 12 prompt 中要求 Codex 创建。

不要读取无关历史 prompt。  
不要读取合约源码全文，除非 README 需要确认合约名称或地址。  
不要读取无关组件。

\---

## 3\. Task 12 目标

Task 12 是最终 integration + documentation 收口，不是新增业务功能。

目标是让评审或部署者能快速理解并运行项目：

1. 项目是什么
2. 当前 P0 已完成哪些能力
3. 技术架构是什么
4. 如何配置环境变量
5. 如何启动 backend / frontend
6. 如何走完整 demo flow
7. 如何验证链上交易和事件
8. 当前限制和后续计划是什么
9. 如何为部署做准备

\---

## 4\. 生成的 Codex prompt 应覆盖

请生成一份完整的 Codex 执行 prompt，保存为：

```text
docs/superpowers/prompts/task12-integration-readme-prompt.md
```

该 prompt 必须包含以下结构：

1. 标题
2. 当前项目状态
3. Task 12 范围说明
4. 允许修改的文件
5. 禁止修改的文件
6. README 内容结构要求
7. env example 检查要求
8. 本地启动说明要求
9. Demo flow 验证路径
10. Arc Testnet / Arcscan 验证说明
11. 当前限制说明
12. 不要新增功能的约束
13. build / smoke test 命令
14. git diff 检查
15. Task 12 验收 checklist
16. progress.md 更新规则

\---

## 5\. 允许修改

优先允许：

* `README.md`
* `apps/web/.env.example`
* `agents/risk-worker/.env.example`

`docs/superpowers/progress.md` 不允许 Codex 修改，只能验收后由 ClaudeCode 更新。

可选允许：

* `docs/demo-flow.md`
* `docs/deployment-notes.md`

但建议优先收敛在 `README.md`，避免文档分散。

\---

## 6\. 禁止修改

生成的 Codex prompt 必须明确禁止修改：

* `contracts/`
* `agents/risk-worker` 源码
* `apps/web/app/`
* `apps/web/components/`
* `apps/web/hooks/`
* `apps/web/lib/`
* `apps/web/next.config.js`
* `package.json`
* `package-lock.json`
* `docs/superpowers/progress.md`

除非 README 中发现 env example 明显缺失，可以只修改 env example 文件，不改业务代码。

\---

## 7\. README 建议结构

生成的 Codex prompt 中，README 应包含：

### 7.1 Project Overview

说明：

* CopyGuard Bond 是 Arc Testnet 上的 copy-trading risk protection demo
* 用户可以查看 leader risk、创建 protection bond、解锁 full risk report、查看链上事件
* 不要写成保险产品
* 不要写成 Arc 官方概念
* 不要声称 mainnet / production ready

### 7.2 Core Features

包含：

* Leader Registry
* AI Risk Scoring with deterministic fallback
* Protection Bond creation
* My Bond status
* x402-style Full Report unlock
* On-chain Event Stream

### 7.3 Architecture

说明：

* contracts
* FastAPI risk worker
* Next.js frontend
* Reown AppKit / Wagmi / Viem
* Arc Testnet RPC
* Arcscan verification

### 7.4 Environment Variables

分别列出：

Frontend:

* `NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID`
* `NEXT\_PUBLIC\_API\_BASE\_URL`
* `NEXT\_PUBLIC\_BOND\_VAULT\_ADDRESS`
* `NEXT\_PUBLIC\_REPORT\_PAYMENT\_ADDRESS`
* `NEXT\_PUBLIC\_RISK\_ORACLE\_ADAPTER\_ADDRESS`
* `NEXT\_PUBLIC\_LEADER\_REGISTRY\_ADDRESS`

Backend:

* `ARC\_RPC\_URL`
* `REPORT\_PAYMENT\_ADDRESS`
* `ORACLE\_PRIVATE\_KEY`
* `LLM\_PROVIDER`
* `LLM\_API\_KEY`

注意：如果实际 env 名称不同，以现有 `.env.example` 为准，不要虚构。

### 7.5 Local Development

包括：

* 安装依赖
* 启动 backend
* 启动 frontend
* build frontend

### 7.6 Demo Walkthrough

必须包含明确路径：

1. 打开 `/`
2. 进入 `/leaders`
3. 打开 `/leaders/hl\_leader\_03`
4. 连接钱包
5. 创建 bond
6. 解锁 full risk report
7. 打开 `/events` 查看链上事件

### 7.7 On-chain Verification

说明：

* bond 创建 tx 可在 Arcscan 查看
* report payment tx 可在 Arcscan 查看
* events 页面读取 getLogs
* 当前测试链为 Arc Testnet

### 7.8 Known Limitations

必须诚实说明：

* 当前是 Arc Testnet P0
* risk data 使用 deterministic/mock leader data
* refund/slash/settle 不是前端交互重点
* full production monitoring 未完成
* 不是金融建议
* 不是保险承诺

### 7.9 Deployment Notes

可以加入简短部署说明：

* 可通过 Docker / VPS 部署
* backend 和 frontend 需要分别配置 env
* domain / reverse proxy / HTTPS 后续处理

但不要在 Task 12 里直接创建 Docker 文件，Docker 部署可以作为后续独立部署任务处理。

\---

## 8\. 技术约束

Codex 不得：

* 修改业务代码
* 新增功能
* 改合约
* 改后端逻辑
* 改前端页面
* 改 `package.json`
* 改 `package-lock.json`
* 更新 `progress.md`

Task 12 是文档和集成说明收口。

\---

## 9\. 验证要求

生成的 Codex prompt 中必须包含：

```bash
cd apps/web \&\& npm run build
```

如果 backend 有已知启动命令，也应要求 README 写清楚，但不要求 Codex 运行长驻服务。

\---

## 10\. git diff 检查

生成的 Codex prompt 中必须包含以下 git diff 检查：

```bash
git diff --stat
git diff --stat contracts
git diff --stat agents/risk-worker -- ':!agents/risk-worker/.env.example'
git diff --stat apps/web/app
git diff --stat apps/web/components
git diff --stat apps/web/hooks
git diff --stat apps/web/lib
git diff --stat apps/web/next.config.js
git diff --stat package.json package-lock.json
git diff --stat docs/superpowers/progress.md
```

预期：

* README 和 env example 可以有变更
* 禁止修改范围应无输出
* `docs/superpowers/progress.md` 不应由 Codex 修改

\---

## 11\. 验收 checklist 要求

生成的 Codex prompt 里至少包含 27 项验收 checklist，包括：

1. README.md 存在
2. README 有 Project Overview
3. README 有 Core Features
4. README 有 Architecture
5. README 有 Frontend env
6. README 有 Backend env
7. README 有 Local Development
8. README 有 Demo Walkthrough
9. README 有 On-chain Verification
10. README 有 Known Limitations
11. README 有 Deployment Notes
12. 不声称 mainnet
13. 不声称 production ready
14. 不声称 insurance
15. 不声称 guaranteed protection
16. 不把 protection bond 说成 Arc 官方概念
17. demo flow 路径包含 `/leaders`
18. demo flow 路径包含 `/leaders/hl\_leader\_03`
19. demo flow 路径包含 `/events`
20. env example 与 README 基本一致
21. build 通过
22. 不修改 `contracts/`
23. 不修改业务前端代码
24. 不修改后端源码
25. 不修改 `package.json` / `package-lock.json`
26. Codex 不修改 `progress.md`
27. README 对测试网和限制说明清楚

\---

## 12\. progress.md 更新规则

Codex 不更新 `progress.md`。

Task 12 实现后，由 ClaudeCode 验收：

如果验收通过：

* 将 Task 12 标记为 `COMPLETE ✅`
* Current Status 改为 `Deployment / Final Submission`
* 标记 P0 implementation complete

如果失败：

* 不更新 `progress.md`
* 输出失败项和修复建议

\---

## 13\. 你本轮不要做的事

不要直接写 README。  
不要修改任何项目文件。  
不要进入 Codex execution。  
不要生成 Docker 文件。  
不要开始部署。  
不要读取无关文件。

\---

## 14\. 最终输出

完成后输出：

```text
已生成 Task 12 Codex 执行 prompt
文件路径：docs/superpowers/prompts/task12-integration-readme-prompt.md
覆盖内容：
- README 结构
- env example 检查
- 本地运行说明
- demo flow
- Arcscan 验证
- Known limitations
- build / git diff 检查
- 验收 checklist
等待交给 Codex 执行
```

