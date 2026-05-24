# ClaudeCode / Superpowers：项目上下文恢复 Prompt

> 用途：新开 ClaudeCode 窗口后，将本文件内容复制给 ClaudeCode，用于进入 Superpowers 工作流程并恢复项目上下文。
>
> 目标：让 ClaudeCode + Superpowers 理解当前 CopyGuard Bond 项目的整体进度、实现情况、代码结构和剩余工作。
>
> 注意：本 prompt 只用于上下文恢复，不执行 Task 12，不生成 Codex prompt，不修改任何文件。

---

这是一个新的 ClaudeCode 窗口。上一窗口因为 context window limit 中断。

请进入当前 CopyGuard Bond 项目的 Superpowers 工作流程。

本轮只做一件事：恢复项目上下文，理解当前项目进度、实现情况、代码结构和剩余工作。

不要执行任何编码任务。  
不要生成 Codex 执行 prompt。  
不要修改任何文件。  
不要更新 `progress.md`。  
不要进入 Task 12 实施。  
不要创建 Docker 文件。  
不要开始部署。

项目根目录：

```text
D:\Work\Development\AI\ClaudeCode\Agora
```

---

## 1. 本轮目标

本轮目标不是推进新任务，而是让你重新理解项目全貌。

请通过读取必要的进度文件、计划文件、关键代码文件和项目结构，恢复到足够继续后续工作的上下文程度。

你需要理解：

1. 项目整体目标是什么
2. P0 当前完成到了什么程度
3. 各个 Task 已完成哪些能力
4. 当前前端、后端、合约分别实现了什么
5. 当前核心 demo flow 如何跑通
6. 当前代码结构是什么
7. 当前剩余工作有哪些
8. 哪些文件以后不能随便改
9. 后续继续工作时应遵守什么边界

本轮结束后，只输出“项目上下文恢复总结”，然后停止，等待我下一步指令。

---

## 2. 读取策略

请先轻量扫描，再选择性读取。

优先使用：

```bash
git status --short
git diff --stat
dir
dir docs
dir docs\superpowers
dir docs\superpowers\prompts
dir apps\web
dir agents
dir contracts
```

如果当前环境支持 `rg`，优先用 `rg` 检索，不要无脑全文读取大文件。

不要读取：

- `node_modules`
- `.next`
- `package-lock.json` 全文
- 大型 build 输出
- 无关缓存文件
- 无关历史对话文件

---

## 3. 必须读取的进度 / 计划文件

请读取：

```text
docs/superpowers/progress.md
```

如果存在，也请读取这些项目级计划/说明文件：

```text
copyguard-bond-p0-execution-plan.md
progress.md
README.md
docs/demo-flow.md
docs/deployment-notes.md
```

如果文件不存在，记录“不存在”即可，不要报错中断。

---

## 4. 需要了解的 prompts / 工作流文件

请只做索引和必要读取，不要全文读取所有历史 prompt。

先列出：

```text
docs/superpowers/prompts/
```

然后重点识别这些类别的文件：

- Task 8A 相关
- Task 9B 相关
- Task 10B 相关
- Task 10C 相关
- Task 11 相关
- Task 12 相关

不需要全文读取所有 prompt。  
只需要根据文件名和必要片段，确认每个阶段大致做过什么。

如果需要读取某个 prompt，只读取最相关的摘要、目标、允许修改、禁止修改、验收 checklist 部分。

---

## 5. 需要读取的前端关键文件

请读取或摘要这些文件，以理解当前前端实现：

```text
apps/web/package.json
apps/web/.env.example
apps/web/app/page.tsx
apps/web/app/layout.tsx
apps/web/app/providers.tsx
apps/web/app/leaders/page.tsx
apps/web/app/leaders/[id]/page.tsx
apps/web/app/events/page.tsx
apps/web/lib/arc.ts
apps/web/lib/contracts.ts
apps/web/lib/api.ts
```

请重点理解：

- 首页当前定位和 CTA
- leaders 列表如何展示
- leader detail 如何组织 risk / bond / report
- wallet provider 如何配置
- Arc Testnet chain config
- 合约地址和 ABI 在前端如何定义
- API base URL 如何配置

---

## 6. 需要读取的前端组件 / hooks

请读取或摘要这些核心文件：

```text
apps/web/components/wallet-connect.tsx
apps/web/components/bond-create-modal.tsx
apps/web/components/my-bond-card.tsx
apps/web/components/report-paywall.tsx
apps/web/components/event-feed.tsx
apps/web/hooks/use-leaders.ts
apps/web/hooks/use-user-bond.ts
apps/web/hooks/use-events.ts
```

请重点理解：

- 钱包连接入口
- `createBond` 调用链路
- `MyBondCard` 如何读取用户 bond
- `ReportPaywall` 如何做 x402-style unlock
- `Events` 如何用 `getLogs` 读取链上事件
- 哪些是只读展示，哪些会发链上交易

---

## 7. 需要了解的后端文件

请读取或摘要后端关键入口，不要全文读取无关文件。

优先看：

```text
agents/risk-worker/.env.example
agents/risk-worker
```

先列目录，再读取关键文件。

重点找：

- FastAPI app 入口
- report API 路由
- x402 / payment verification 逻辑
- risk scoring 逻辑
- deterministic fallback
- Arc RPC / `REPORT_PAYMENT_ADDRESS` / `ORACLE_PRIVATE_KEY` 等 env 使用方式

可使用类似搜索：

```bash
rg "FastAPI|@app|reports|x402|payment|REPORT_PAYMENT|ARC_RPC|ORACLE|risk|leader" agents/risk-worker
```

不要读取无关大文件。

---

## 8. 需要了解的合约文件

不要全文阅读所有合约，只做结构理解和关键合约确认。

先列出：

```text
contracts/
```

然后读取或摘要核心合约：

- `CopyGuardBondVault`
- `ReportPayment`
- `RiskOracleAdapter`
- `LeaderRegistry`

重点理解：

- `createBond` 做什么
- `bonds` / `nextBondId`
- `purchaseReport` / `hasPurchased`
- 事件有哪些
- risk update / oracle adapter 的大致作用

可使用搜索：

```bash
rg "contract |event |function |createBond|purchaseReport|hasPurchased|BondCreated|ReportPurchased|RiskUpdated" contracts
```

---

## 9. 需要确认的运行脚本

请从 package 文件中确认脚本：

```text
package.json
apps/web/package.json
```

总结：

- 前端安装 / build / dev 命令
- 后端启动方式是否能从文件中推断
- 是否有 monorepo workspace
- 是否有测试 / deploy 脚本

不要修改 package 文件。

---

## 10. 需要确认的 Git 状态

请执行：

```bash
git status --short
git diff --stat
```

并总结：

- 当前工作区有哪些未提交变更
- 哪些变更属于最近已完成任务
- 是否存在不应该提交的文件，例如 `.env`、`node_modules`、`.next`、local settings
- 是否有 `progress.md` 变更

不要执行：

- `git add`
- `git commit`
- `git restore`
- `git push`

只做观察和总结。

---

## 11. 需要理解的核心业务链路

请根据代码和进度文件，总结当前 P0 demo flow：

1. 首页 `/`
2. Leader 列表 `/leaders`
3. Leader 详情 `/leaders/hl_leader_03`
4. 连接钱包
5. 创建 protection bond
6. `MyBondCard` 读取用户 bond
7. x402-style 支付解锁 full risk report
8. 后端验证 payment tx
9. Events 页面 `/events` 读取链上事件
10. Arcscan 验证交易

---

## 12. 需要特别注意的项目边界

请在总结中明确：

- 当前是 Arc Testnet P0，不是 mainnet
- protection bond 是本项目设计概念，不是 Arc 官方概念
- 不应宣传为 insurance
- 不应宣传 guaranteed protection
- 不应宣传 production ready
- risk data / leader data 当前是 demo / deterministic / mock 性质，但首页文案应尽量正式
- refund / slash / settle 不是当前前端主流程
- 不要随意修改 contracts 和 agents，除非后续任务明确要求

---

## 13. 本轮不要做的事

不要：

- 生成 Task 12 prompt
- 写 README
- 修改 README
- 修改代码
- 修改 env example
- 修改 progress.md
- 运行长驻服务
- 创建 Docker 文件
- 开始部署
- `git add`
- `git commit`
- `git push`

---

## 14. 输出格式

请按下面格式输出项目上下文恢复总结：

### 1. 项目概览

- 项目名称：
- 项目目标：
- 当前 P0 定位：
- 当前运行网络：
- 当前核心用户路径：

### 2. Superpowers 进度

- Last updated：
- 已完成任务：
- 当前剩余任务：
- Current Status：
- `progress.md` 中需要注意的信息：

### 3. 当前代码结构

请按模块总结：

- `contracts`：
- `agents/risk-worker`：
- `apps/web`：
- `docs`：
- `docs/superpowers`：

### 4. 前端实现情况

- 首页：
- leaders 列表：
- leader detail：
- wallet：
- createBond：
- MyBondCard：
- ReportPaywall：
- Events：
- Arc / contracts / API 配置：

### 5. 后端实现情况

- FastAPI 入口：
- report API：
- risk scoring：
- x402 / payment verification：
- env 配置：
- 当前限制：

### 6. 合约实现情况

- CopyGuardBondVault：
- ReportPayment：
- RiskOracleAdapter：
- LeaderRegistry：
- 关键事件：
- 当前链上地址来源：

### 7. 当前 Git 状态

- 未提交变更摘要：
- 可能需要排除的文件：
- 是否存在敏感 env：
- 是否适合提交：

### 8. 当前已跑通能力

请列出已经实现并验收过的能力。

### 9. 当前剩余工作

不要展开执行，只列出剩余工作：

- 文档 / README 收口：
- 部署准备：
- 最终提交材料：
- 其他风险项：

### 10. 后续工作建议

请只说明下一步建议，不要执行：

- 是否已经足够进入下一步任务：
- 下一步建议让你生成什么：
- 还需要补充读取什么文件：

本轮完成后停止，等待我的下一步指令。
