# ClaudeCode / Superpowers：生成 Task 9B 执行上下文 Prompt

> 用途：将本文件内容复制给 ClaudeCode，让 ClaudeCode 在当前 Superpowers 工作流中生成 `Task 9B Home Page Demo Polish` 的 Codex 执行上下文 / 执行 prompt。
>
> 注意：这不是给 Codex 的编码执行 prompt，而是给 ClaudeCode + Superpowers 的上游 prompt。

\---

继续当前 Superpowers 工作流。

注意：不要恢复工作流，不要重新读取无关历史文件，不要进入 Codex execution，不要直接修改业务代码。

本轮目标：生成 Task 9B Home Page Demo Polish 的执行上下文 / Codex 执行 prompt，并保存到 docs/superpowers/prompts/ 下。



## 1\. 当前背景

项目：CopyGuard Bond P0 hackathon demo

当前已完成并验收通过：

* Task 1–7：合约、后端、x402、链上提交基础能力
* Task 8A：Next.js + Reown AppKit 钱包 + leaders + createBond 最小闭环
* Task 10B：MyBondCard，读取并展示用户 bond 状态
* Task 10C：ReportPaywall，ReportPayment + x402-style unlock full report
* Task 11：Events Page，真实读取 Arc Testnet getLogs 事件流

当前 progress.md 已显示剩余任务：

* Task 9B: Home Page Demo Polish
* Task 12: Integration + README

本轮要做的是 Task 9B，不是 Task 12。

## 2\. 需要读取的文件

只读取必要文件：

1. docs/superpowers/plan/copyguard-bond-p0-execution-plan.md
2. docs/superpowers/progress.md
3. docs/superpowers/prompts/task11-events-page-prompt-revised.md
4. apps/web/app/page.tsx



不要读取 Task 8/10/11 的其他历史 prompt。
不要读取合约源码。
不要读取后端源码。
不要读取无关组件。

## 3\. Task 9B 的定位

Task 9B 是 Home Page Demo Polish。

它不是新增业务功能，不是重构前端，不是新增链上交互。

目标是把首页 `/` 从基础入口页打磨成评审友好的 demo landing page，让评审在 10 秒内理解：

1. CopyGuard Bond 是什么
2. 它解决什么问题
3. 当前 demo 已经完成哪些 Arc Testnet 链上能力
4. 评审应该如何走完整 demo flow
5. 从首页能快速进入：

   * `/leaders`
   * `/leaders/hl\_leader\_03`
   * `/events`

## 4\. 输出要求

请生成一份给 Codex 执行的完整 Task 9B prompt，并保存为：

```text
docs/superpowers/prompts/task9b-home-page-polish-prompt.md
```

该 prompt 必须采用类似 task11-events-page-prompt-revised.md 的结构，包括：

1. 标题
2. 范围说明
3. 当前项目状态
4. 任务目标
5. 允许修改的文件
6. 禁止修改的文件
7. 页面内容结构设计
8. UI / 技术约束
9. Codex 执行步骤
10. 验证命令
11. git diff 范围检查
12. 验收 checklist
13. progress.md 更新规则

## 5\. Task 9B 范围约束

生成的 Codex prompt 必须明确：

优先只允许修改：

* apps/web/app/page.tsx

如确实需要拆组件，最多允许新增：

* apps/web/components/home-demo-section.tsx
* apps/web/components/home-status-card.tsx

但应优先只改 page.tsx。

明确禁止修改：

* contracts/
* agents/
* apps/web/lib/contracts.ts
* apps/web/lib/api.ts
* apps/web/lib/wagmi.ts
* apps/web/lib/arc.ts
* apps/web/app/providers.tsx
* apps/web/app/leaders/
* apps/web/app/events/
* apps/web/hooks/
* apps/web/components/wallet-connect.tsx
* apps/web/components/bond-create-modal.tsx
* apps/web/components/my-bond-card.tsx
* apps/web/components/report-paywall.tsx
* apps/web/components/event-feed.tsx
* apps/web/next.config.js
* package.json
* package-lock.json
* docs/superpowers/progress.md

注意：Codex 不要更新 progress.md。progress.md 只在 Task 9B 验收通过后由 ClaudeCode 验收流程更新。

## 6\. 首页内容设计要求

生成的 Codex prompt 中，首页应规划以下 section：

### Section 1: Hero

包含：

* `ARC TESTNET MVP`
* `CopyGuard Bond`
* `Arc-native protection layer for copy-trading followers.`
* 简短说明：

  * AI risk scoring
  * on-chain protection bond
  * x402-style report unlock
  * Arc Testnet event tracking

CTA：

* View Leaders -> `/leaders`
* Try Risk Demo -> `/leaders/hl\_leader\_03`
* View Events -> `/events`

要求 Codex 使用 Next.js `Link`，不要使用 `Button asChild`。

### Section 2: Demo Flow

4 步：

1. Review Leaders
2. Create Bond
3. Unlock Report
4. Track Events

### Section 3: Live Proof / What Works

展示当前已完成能力：

* 5 mock leaders
* Arc Testnet contracts deployed
* createBond confirmed
* MyBond on-chain read
* x402-style full report unlock
* Events page reads getLogs

### Section 4: Architecture / Why Arc

解释：

* Native USDC flow
* Verifiable actions on Arcscan
* AI + deterministic fallback scoring
* x402-style paid access

### Section 5: Demo Entry Points

入口：

* `/leaders`
* `/leaders/hl\_leader\_03`
* `/events`

## 7\. 文案准确性要求

生成的 Codex prompt 必须提醒 Codex：

不要写：

* insurance
* guaranteed protection
* mainnet
* production ready
* official Arc risk bond
* real exchange integration
* automatic slashing/refund is live

可以写：

* protection bond
* Arc Testnet MVP
* x402-style payment unlock
* on-chain demo flow
* AI risk scoring with deterministic fallback

尤其注意：不要把“链上风险保护 bond”描述成 Arc 官方概念，只能描述为本项目基于 Arc Testnet 实现的 demo 机制。

## 8\. 技术要求

生成的 Codex prompt 必须要求：

* 首页保持 server component
* 除非绝对必要，不添加 `"use client"`
* 不调用 API
* 不调用 fetch
* 不调用 wagmi hooks
* 不调用 viem
* 不读取 localStorage
* 不读取 wallet state
* 不读取 backend
* 不读取链上数据
* 不新增依赖
* 不新增 env
* 不新增 API route

## 9\. 验证要求

生成的 Codex prompt 中必须包含这些验证命令：

```bash
cd apps/web \&\& npm run build
```

以及 git diff 范围检查：

```bash
git diff --stat
git diff --stat contracts
git diff --stat agents
git diff --stat apps/web/next.config.js
git diff --stat apps/web/app/leaders
git diff --stat apps/web/app/events
git diff --stat apps/web/components/bond-create-modal.tsx
git diff --stat apps/web/components/my-bond-card.tsx
git diff --stat apps/web/components/report-paywall.tsx
git diff --stat apps/web/components/event-feed.tsx
git diff --stat package.json package-lock.json
```

## 10\. 验收 checklist 要求

生成的 Codex prompt 中必须包含 Task 9B 验收 checklist，至少包括：

1. npm run build 通过
2. `/` 首页可打开
3. 首页有完整 demo landing 结构
4. Hero 有项目定位
5. CTA 到 `/leaders`
6. CTA 到 `/leaders/hl\_leader\_03`
7. CTA 到 `/events`
8. Demo Flow 存在
9. Live Proof / What Works 存在
10. Architecture / Why Arc 存在
11. Demo Entry Points 存在
12. 首页不调用 API
13. 首页不读链
14. 首页不要求钱包连接
15. 首页不使用 Button asChild
16. 首页没有新增 use client，除非有明确必要
17. 移动端布局不明显崩坏
18. 不修改 contracts/
19. 不修改 agents/
20. 不修改 next.config.js
21. 不修改 leaders 页面
22. 不修改 events 页面
23. 不修改 Task 8A / 10B / 10C / 11 组件
24. 不修改 package.json / package-lock.json
25. `/leaders` 仍可打开
26. `/leaders/hl\_leader\_03` 仍可打开
27. `/events` 仍可打开
28. 文案明确这是 Arc Testnet MVP
29. 文案没有把 protection bond 说成 Arc 官方概念
30. progress.md 未被 Codex 修改

## 11\. 你本轮不要做的事

不要直接实现 Task 9B。
不要修改 apps/web/app/page.tsx。
不要修改 progress.md。
不要调用 Codex。
不要进入 Task 12。
不要创建 Docker 文件。
不要读取非必要文件。

## 12\. 最终输出

完成后输出：

* 已生成 Task 9B Codex 执行 prompt
* 文件路径：docs/superpowers/prompts/task9b-home-page-polish-prompt.md
* 简要说明 prompt 覆盖了哪些部分
* 等待我交给 Codex 执行

