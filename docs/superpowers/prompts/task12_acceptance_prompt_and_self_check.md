# Task 12 验收 Prompt

```text
Task 12 已由 Codex 完成，现在进入 Superpowers 验收流程。

本轮目标：验收 Task 12: Integration + README。

不要进入 Codex execution。
不要修改业务代码。
不要修改 README / env example 内容，除非只是读取检查。
不要创建 Docker 文件。
不要开始部署。
不要 git add / commit / push。

可以在验收通过后，只更新：

docs/superpowers/progress.md

---

## 当前 Codex 完成情况

Codex 声称已完成：

修改文件：

1. README.md
   - 新增最终集成 README

2. apps/web/.env.example
   - 补充 NEXT\\\_PUBLIC\\\_APP\\\_URL

3. agents/risk-worker/.env.example
   - 填入已部署合约地址，避免空值配置

验证结果：

- cd apps/web \\\&\\\& npm run build: PASS
- 仍有既有 Reown/Wagmi warning，不阻塞 build
- Git diff 范围：PASS，禁止范围无 diff
- Checklist: 30/30

备注：

- 当前工作区还有 .claude/settings.local.json
- 当前工作区还有 docs/superpowers/prompts/task12-\\\* 相关 prompt 文件
- 这些不属于 Task 12 README 实现本身，需要在验收总结中单独说明是否应提交

---

## 请读取的文件
基于 docs/superpowers/prompts/task12-integration-readme-prompt-revised-cn.md 文件中 checklist 章节内容，以及下面的内容进行验收。必须读取：

1. docs/superpowers/progress.md
2. README.md
3. apps/web/.env.example
4. agents/risk-worker/.env.example
5. package.json
6. apps/web/package.json

必要时可以读取：

7. apps/web/lib/contracts.ts
8. apps/web/lib/arc.ts
9. apps/web/lib/api.ts
10. agents/risk-worker/config.py

不要读取无关历史 prompt 全文。
不要读取 node\\\_modules。
不要读取 .next。
不要读取 package-lock.json 全文。

---

## 验收目标

确认 Task 12 是否真正完成以下内容：

1. README.md 存在于项目根目录
2. README 覆盖 Project Overview
3. README 覆盖 Core Features
4. README 覆盖 Architecture
5. README 覆盖 Environment Variables
6. README 覆盖 Local Development
7. README 覆盖 Demo Walkthrough
8. README 覆盖 On-chain Verification
9. README 覆盖 Known Limitations
10. README 覆盖 Deployment Notes
11. README 明确说明 Arc Testnet / P0 / hackathon demo
12. README 不声称 mainnet
13. README 不声称 production-ready
14. README 不声称 insurance
15. README 不声称 guaranteed protection
16. README 不把 protection bond 描述成 Arc 官方概念
17. README 中 demo flow 包含 /
18. README 中 demo flow 包含 /leaders
19. README 中 demo flow 包含 /leaders/hl\\\_leader\\\_03
20. README 中 demo flow 包含 /events
21. README 中合约地址正确
22. README 中 env var 与 .env.example 一致
23. apps/web/.env.example 没有重复 key
24. agents/risk-worker/.env.example 没有重复 key
25. agents/risk-worker/.env.example 中 REPORT\\\_PAYMENT\\\_ADDRESS 不为空，且只出现一次
26. cd apps/web \\\&\\\& npm run build 通过
27. contracts/ 无 diff
28. agents/risk-worker 源码无 diff，只允许 .env.example 有变更
29. apps/web/app、components、hooks、lib 无 diff
30. package.json / package-lock.json / next.config.js 无 diff
31. docs/superpowers/progress.md 在验收前不应已有本次 Codex 修改
32. 当前新增 README 和 env example 符合 Task 12 范围

---

## 请执行的命令

先检查状态：

git status --short
git diff --stat

检查允许变更：

git diff --stat README.md
git diff --stat apps/web/.env.example
git diff --stat agents/risk-worker/.env.example

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
git diff --stat docs/superpowers/progress.md

运行 build：

cd apps/web \\\&\\\& npm run build

---

## 如果验收通过

请输出：

Task 12: PASS

并更新：

docs/superpowers/progress.md

更新要求：

1. 将 Task 12 标记为 COMPLETE ✅
2. Current Status 改为：
   Deployment / Final Submission
3. 标记 P0 implementation complete
4. 添加 Task 12 验收备注：
   - README.md completed
   - env examples reviewed
   - build passed
   - forbidden diff ranges clean
   - known limitation statements included

然后输出：

- Task 12: PASS
- Checklist 通过数量
- progress.md 已更新
- 当前 P0 状态
- 下一步建议：Git cleanup / commit / Docker deployment / final submission

---

## 如果验收不通过

不要更新 progress.md。

请输出：

- Task 12: FAIL
- 失败项列表
- 对应文件和原因
- 最小修复建议
```

