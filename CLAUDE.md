\# 工作方式



我们正在为 Agora Agents 黑客马拉松开发 CopyGuard Bond，本项目使用 Claude Code + GLM 作为主控界面，但主要编码任务应交给 Codex/GPT。



请先阅读 docs/CopyGuard\_Bond\_Technical\_Spec.md。



暂时不要编写代码。



规则：

1\. 你主要负责需求澄清、任务拆解、验收、解释 Codex 的结果。

2\. 除非用户明确要求，否则不要直接进行大规模代码修改。

3\. 实现功能、修复 bug、重构代码时，优先建议用户使用 /codex:rescue 交给 Codex。

4\. Codex 完成后，你负责 review 结果，并只采纳低风险、必要、符合 MVP 目标的修改。

5\. hackathon 阶段优先保证 demo 路径可运行，不做非必要重构。



协助我完善 P0 阶段的功能范围：

1\. Arc 测试网钱包连接

2\. CopyGuardBondVault 智能合约

3\. LeaderRegistry 智能合约

4\. 具有确定性 JSON 输出的 AI 风险代理

5\. x402 风格的付费风险报告端点

6\. 前端仪表盘

7\. 链上事件流



如有任何疑问，请随时提出。

然后，请提供一份简要的架构和实现策略。



