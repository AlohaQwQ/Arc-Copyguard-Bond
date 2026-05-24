# ClaudeCode / Superpowers：Task 9B 首页正式产品化后验收 Prompt

> 用途：将本文件内容复制给 ClaudeCode，让 ClaudeCode 在当前 Superpowers 工作流中验收 Task 9B。
>
> 注意：这是给 ClaudeCode + Superpowers 的验收 prompt，不是给 Codex 的编码执行 prompt。

\---

继续当前 Superpowers 工作流。

不要恢复工作流。  
不要重新读取无关历史文件。  
不要进入 Codex execution。  
不要直接开始 Task 12。  
不要创建 Docker 文件。

本轮目标：验收 Task 9B Home Page Demo Polish。  
如果验收通过，更新 `docs/superpowers/progress.md`。  
如果验收失败，不更新 `progress.md`，只输出失败项和最小修复建议。

\---

## 1\. 当前状态

Task 9B 已由 Codex 执行完成，并追加做了一次首页文案正式产品化 follow-up。

当前已知情况：

* Codex 主要修改文件：`apps/web/app/page.tsx`
* 首页已从基础入口页打磨为正式产品风格 landing page
* 页面保留 5 个主要区块：

  * Hero
  * Protection Flow / How It Works
  * On-chain Capabilities
  * Architecture / Why Arc
  * Entry Points
* CTA 指向：

  * `/leaders`
  * `/leaders/hl\_leader\_03`
  * `/events`
* 首页应保持 server component
* 不应新增 `"use client"`
* 不应调用 API / fetch
* 不应调用 wagmi / viem
* 不应读取 localStorage
* 不应依赖钱包连接
* 不应使用 `Button asChild`
* 不应修改业务链路
* `cd apps/web \&\& npm run build` 应通过

本次 follow-up 重点是：  
把首页从明显的 hackathon demo / MVP 语气，调整为更像正式产品 landing page 的语气，同时保留 `Arc Testnet` 的诚实说明。

\---

## 2\. 需要读取的文件

只读取必要文件：

1. `docs/superpowers/progress.md`
2. `docs/superpowers/prompts/task9b-home-page-polish-prompt-revised.md`
3. `apps/web/app/page.tsx`

如果存在 Task 9B follow-up prompt，也可以读取：

```text
docs/superpowers/prompts/task9b-homepage-formal-copy-followup-prompt.md
```

或同义文件名。

不要读取：

* Task 8 / Task 10 / Task 11 的其他历史 prompt
* 合约源码
* 后端源码
* 无关组件
* Docker 文件
* 无关文档

\---

## 3\. 验收范围

基于 task9b-home-page-polish-prompt-revised.md 文件中 CheckList 章节内容，以及下面的内容进行验收。注意本次只验收 Task 9B 首页 polish。

Task 9B 不是新增业务功能，不是改链上逻辑，不是改后端。

验收重点：

1. 首页是否是正式产品化 landing page
2. 首页是否保留清晰的核心路径入口
3. 首页是否没有引入新的业务依赖
4. 首页是否没有破坏 Task 8A / 10B / 10C / 11 已完成能力
5. 文案是否准确，不夸大，不把项目说成 Arc 官方概念
6. build 是否通过
7. diff 范围是否符合预期

\---

## 4\. 验收 checklist

请逐项检查并输出表格。

|#|检查项|预期|
|-|-|-|
|1|`npm run build` 通过|PASS|
|2|`/` 首页可打开|PASS|
|3|首页有完整 landing page 结构|PASS|
|4|Hero 有 CopyGuard Bond 项目定位|PASS|
|5|Hero/首屏不再出现 `ARC TESTNET MVP`|PASS|
|6|首页仍诚实说明运行在 Arc Testnet|PASS|
|7|CTA 到 `/leaders`|PASS|
|8|CTA 到 `/leaders/hl\_leader\_03`|PASS|
|9|CTA 到 `/events`|PASS|
|10|Flow / How It Works 区域存在|PASS|
|11|主要 section 标题不再出现 `Demo Flow`|PASS|
|12|不出现 `Walk the full MVP path`|PASS|
|13|不出现 `judge`|PASS|
|14|不出现 `mock leaders`|PASS|
|15|不出现 `full MVP path`|PASS|
|16|不出现 `production ready`|PASS|
|17|不出现 `mainnet`|PASS|
|18|不出现 `insurance`|PASS|
|19|不出现 `guaranteed protection`|PASS|
|20|不出现 `official Arc risk bond`|PASS|
|21|不把 protection bond 描述为 Arc 官方概念|PASS|
|22|On-chain Capabilities / What Works 区域存在|PASS|
|23|Architecture / Why Arc 区域存在|PASS|
|24|Entry Points 区域存在|PASS|
|25|首页不调用 API / fetch|PASS|
|26|首页不读链|PASS|
|27|首页不使用 wagmi hooks|PASS|
|28|首页不使用 viem|PASS|
|29|首页不读取 localStorage|PASS|
|30|首页不要求钱包连接才能浏览内容|PASS|
|31|首页不使用 `Button asChild`|PASS|
|32|首页没有新增 `"use client"`|PASS|
|33|移动端布局不明显崩坏|PASS|
|34|不修改 `contracts/`|PASS|
|35|不修改 `agents/`|PASS|
|36|不修改 `apps/web/lib/`|PASS|
|37|不修改 `apps/web/hooks/`|PASS|
|38|不修改 `apps/web/app/leaders/`|PASS|
|39|不修改 `apps/web/app/events/`|PASS|
|40|不修改 Task 8A / 10B / 10C / 11 组件|PASS|
|41|不修改 `apps/web/next.config.js`|PASS|
|42|不修改 `package.json` / `package-lock.json`|PASS|
|43|Codex 未修改 `docs/superpowers/progress.md`|PASS|
|44|`/leaders` 页面仍可打开|PASS|
|45|`/leaders/hl\_leader\_03` 页面仍可打开|PASS|
|46|`/events` 页面仍可打开|PASS|
|47|首页文案整体更像正式产品 landing page，而不是 hackathon demo page|PASS|

\---

## 5\. 需要执行的检查命令

### 5.1 build 检查

在 `apps/web` 目录执行：

```bash
npm run build
```

或者在项目根目录执行：

```bash
cd apps/web \&\& npm run build
```

允许已有 Reown/Wagmi 相关 warning，只要 build 不失败。

\---

### 5.2 diff 范围检查

在项目根目录执行：

```bash
git diff --stat
git diff --stat contracts
git diff --stat agents
git diff --stat apps/web/lib
git diff --stat apps/web/hooks
git diff --stat apps/web/app/leaders
git diff --stat apps/web/app/events
git diff --stat apps/web/components
git diff --stat apps/web/next.config.js
git diff --stat apps/web/app/providers.tsx
git diff --stat package.json package-lock.json
git diff --stat docs/superpowers/progress.md
```

预期：

* 本次 Task 9B 主要只修改 `apps/web/app/page.tsx`
* 禁止修改范围应无输出
* 如果工作区存在之前任务遗留 diff，需要区分是否由 Task 9B 引入，不要误判
* `docs/superpowers/progress.md` 在验收通过前不应被 Codex 修改

\---

### 5.3 首页可见文案检查

在 `apps/web/app/page.tsx` 中检查，不应保留这些明显 demo/MVP 化表达：

```text
ARC TESTNET MVP
Demo Flow
Walk the full MVP path
judge
mock leaders
full MVP path
production ready
mainnet
insurance
guaranteed protection
official Arc risk bond
```

注意：

* `demo` 一词尽量不应出现在主要 section 标题或 CTA 中
* `Arc Testnet` 可以出现
* `MVP` 不应出现在 Hero eyebrow 或核心标题中

\---

## 6\. 浏览器手动验收

如果本地服务可用，请打开：

```text
http://localhost:3000/
```

检查：

1. 首页首屏像正式产品 landing page
2. 首屏没有明显 hackathon demo / judge walkthrough 语气
3. 钱包未连接时也可以完整浏览首页
4. CTA 点击正常：

   * `/leaders`
   * `/leaders/hl\_leader\_03`
   * `/events`
5. 窄屏或浏览器缩小时布局不明显崩坏

同时打开：

```text
http://localhost:3000/leaders
http://localhost:3000/leaders/hl\_leader\_03
http://localhost:3000/events
```

确认已完成页面仍可访问。

\---

## 7\. 验收输出格式

请按以下格式输出：

```text
Task 9B: PASS / FAIL

验收结果：
- xx/47 项通过

关键结论：
- 首页已完成正式产品化 polish / 或仍存在问题
- build 是否通过
- diff 范围是否符合预期
- 是否可进入 Task 12

Checklist：
| # | 检查项 | 状态 | 证据 |
|---|---|---|---|
| 1 | ... | PASS/FAIL | ... |

如 FAIL：
- 失败项
- 原因
- 最小修复建议
- 不更新 progress.md

如 PASS：
- 更新 docs/superpowers/progress.md
```

\---

## 8\. progress.md 更新规则

如果 Task 9B 验收通过：

1. 将 `Task 9B` 标记为 `COMPLETE ✅`
2. Last updated 更新为当前日期
3. Current Status 指向：

```text
Task 12: Integration + README
```

4. P0 剩余工作保留：

```text
Task 12: Integration + README
Docker deployment / production smoke test
Final submission materials
```

如果 Task 9B 验收失败：

1. 不更新 `progress.md`
2. 输出失败项和最小修复建议
3. 等待我决定是否交给 Codex 修复

\---

## 9\. 本轮不要做的事

不要：

* 进入 Task 12
* 生成 Task 12 prompt
* 创建 Docker 文件
* 修改业务代码
* 修改首页代码
* 修改合约
* 修改后端
* 修改 wallet / wagmi / viem 相关代码
* 修改 events / leaders / report / bond 相关组件
* 读取无关历史文件

\---

## 10\. 最终输出

如果通过，最终输出：

```text
Task 9B: PASS

progress.md 已更新：
- Task 9B 标记为 COMPLETE ✅
- Current Status 指向 Task 12: Integration + README

下一步建议进入 Task 12。
```

如果失败，最终输出：

```text
Task 9B: FAIL

progress.md 未更新。

失败项：
- ...

最小修复建议：
- ...
```

