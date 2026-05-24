# Task 11 Events Page 验收 Prompt

继续当前 Superpowers 流程，进入 Task 11 Events Page 验收。

不要重新恢复工作流。
不要读取无关历史 prompt。
不要进入 Task 9B / Task 12。
不要修改业务代码，除非发现明确阻塞验收的问题。
本轮目标只做 Task 11 代码级验收；验收通过后只更新 `docs/superpowers/progress.md`。

\---

## 1\. 当前背景

Task 11: Events Page 已由 Codex 实现。

目标是替换原 `/events` placeholder，实现真实链上事件页：

* 使用 viem 从 Arc Testnet 读取 CopyGuard 合约事件
* 事件来源：

  * BondVault
  * ReportPayment
  * RiskOracleAdapter
* 支持最近区块范围查询
* 支持 10 秒轮询
* 支持 tabs / event type filter
* 支持 loading / error / empty 状态
* 支持 txHash 跳转 Arcscan
* 不新增链上写操作
* 不影响 Task 8A createBond
* 不影响 Task 10B MyBondCard
* 不影响 Task 10C ReportPaywall

Codex 回报的变更文件：

1. `apps/web/lib/contracts.ts`

   * 只追加 event ABI
2. `apps/web/hooks/use-events.ts`

   * 新增事件读取 hook
3. `apps/web/components/event-feed.tsx`

   * 新增事件流 UI
4. `apps/web/app/events/page.tsx`

   * 替换 placeholder

Codex 回报的实现要点：

* 使用 `getBlockNumber()` 后动态计算 `fromBlock`
* 没有使用 `"latest" - 10000n` 非法写法
* 使用 `120000` block lookback
* Arc RPC 有 `10000` block `getLogs` 限制，所以内部按 `9999` block 分块读取
* 支持 `All / Bonds / Risk / Reports` 过滤
* txHash 链接到 Arcscan
* `npm run build` 已通过
* 未修改 `contracts/`、`agents/`、`next.config.js`、`bond-create-modal.tsx`、`my-bond-card.tsx`、`report-paywall.tsx`

\---

## 2\. 需要读取的文件

请读取并检查以下文件：

1. `apps/web/app/events/page.tsx`
2. `apps/web/components/event-feed.tsx`
3. `apps/web/hooks/use-events.ts`
4. `apps/web/lib/contracts.ts`
5. `apps/web/lib/arc.ts`
6. `apps/web/components/bond-create-modal.tsx`
7. `apps/web/components/my-bond-card.tsx`
8. `apps/web/components/report-paywall.tsx`
9. `docs/superpowers/progress.md`

只读取这些文件。不要读取无关历史 prompt。

\---

## 3\. 需要运行的命令

在项目根目录运行：

```bash
git diff --stat contracts
git diff --stat agents
git diff --stat apps/web/next.config.js
git diff --stat apps/web/components/bond-create-modal.tsx
git diff --stat apps/web/components/my-bond-card.tsx
git diff --stat apps/web/components/report-paywall.tsx
```

预期：以上命令无输出。

然后运行：

```bash
cd apps/web \&\& npm run build
```

预期：build 通过。允许出现此前已存在的 Reown/Wagmi warning，只要不阻塞 build。

再运行：

```bash
git diff --stat apps/web/app/events/page.tsx apps/web/components/event-feed.tsx apps/web/hooks/use-events.ts apps/web/lib/contracts.ts
```

预期：只显示 Task 11 相关变更。

\---

## 4\. Task 11 验收 checklist

请基于 docs/superpowers/prompts/task11-events-page-prompt-revised.md 文件中checklist 段落进行验收，并且结合以下内容逐项验收，并输出 PASS/FAIL 表格。

### A. 文件范围验收

1. PASS 条件：Task 11 只新增或修改以下文件：

   * `apps/web/app/events/page.tsx`
   * `apps/web/components/event-feed.tsx`
   * `apps/web/hooks/use-events.ts`
   * `apps/web/lib/contracts.ts`
2. PASS 条件：`contracts/` 未修改。
3. PASS 条件：`agents/` 未修改。
4. PASS 条件：`apps/web/next.config.js` 未修改。
5. PASS 条件：`apps/web/components/bond-create-modal.tsx` 未修改。
6. PASS 条件：`apps/web/components/my-bond-card.tsx` 未修改。
7. PASS 条件：`apps/web/components/report-paywall.tsx` 未修改。

### B. contracts.ts event ABI 验收

8. PASS 条件：`apps/web/lib/contracts.ts` 只追加 event ABI，不破坏已有 function ABI。
9. PASS 条件：BondVault event ABI 至少包含：

   * `BondCreated`
   * `RiskUpdated`
   * `BondWarned`
   * `BondSlashed`
   * `BondRefunded`
   * `BondSettled`
10. PASS 条件：ReportPayment event ABI 包含：
* `ReportPurchased`
11. PASS 条件：RiskOracleAdapter event ABI 包含：
* `RiskUpdateForwarded`
12. PASS 条件：已有 `createBond` / `bonds` / `nextBondId` / `purchaseReport` / `hasPurchased` 相关 ABI 未被删除或改坏。
13. PASS 条件：已有合约地址导出未被删除或改坏。

### C. use-events.ts 读取逻辑验收

14. PASS 条件：使用 viem public client 读取 Arc Testnet logs。
15. PASS 条件：使用 `getBlockNumber()` 获取 `latestBlock` 后动态计算 `fromBlock`。
16. PASS 条件：没有出现 `"latest" - 10000n` 或类似对字符串 block tag 做 bigint 运算的非法写法。
17. PASS 条件：默认 lookback 覆盖最近 `120000` blocks 或等价范围。
18. PASS 条件：考虑 Arc RPC `getLogs` 10000 block range 限制，按不超过 `9999/10000` block 的 chunk 分块读取。
19. PASS 条件：每个合约事件读取失败时不会导致整个页面崩溃。
20. PASS 条件：读取结果会合并 BondVault / ReportPayment / RiskOracleAdapter 三类事件。
21. PASS 条件：事件按 `blockNumber` 降序排序；排序逻辑正确处理 bigint，不使用可能溢出的 `Number(b.blockNumber - a.blockNumber)`。
22. PASS 条件：事件 normalize 后至少保留：
* `type` / `eventName`
* `category`
* `contractName`
* `blockNumber`
* `transactionHash`
* `args`
23. PASS 条件：缺失 `transactionHash` 或 `blockNumber` 的异常 log 会被安全处理，不导致 UI 崩溃。
24. PASS 条件：使用 TanStack Query 或等价机制进行 10 秒轮询/refetch。
25. PASS 条件：不包含任何链上写操作，不调用 `writeContract`。

### D. event-feed.tsx UI 验收

26. PASS 条件：展示真实事件列表，而不是 placeholder 文案。
27. PASS 条件：支持 `All / Bonds / Risk / Reports` 或等价事件类型过滤。
28. PASS 条件：支持 loading 状态。
29. PASS 条件：支持 error 状态，并展示可理解错误信息。
30. PASS 条件：支持 empty 状态，并说明当前查询窗口内暂无事件。
31. PASS 条件：每条事件至少展示：
* event name
* contract/category
* block number
* txHash
* 关键 args，例如 `bondId` / `leaderId` / `follower` / `payer` / `amount` / `riskScoreBps`，按事件实际字段展示
32. PASS 条件：txHash 链接到 Arcscan。
33. PASS 条件：长地址和 hash 有截断展示，不破坏布局。
34. PASS 条件：事件 badge 或分类视觉上可区分 Bonds / Risk / Reports。
35. PASS 条件：UI 不依赖钱包连接；未连接钱包也能查看事件。
36. PASS 条件：配置缺失或 RPC 失败时页面不崩溃。

### E. /events 页面验收

37. PASS 条件：`apps/web/app/events/page.tsx` 已替换原 coming soon placeholder。
38. PASS 条件：`/events` 页面引用 EventFeed 或等价组件。
39. PASS 条件：页面包含返回首页或导航入口。
40. PASS 条件：页面文案明确这是 Arc Testnet on-chain event stream。
41. PASS 条件：页面为 read-only，不要求用户连接钱包才能加载。
42. PASS 条件：页面不会影响 `/leaders` / leader detail / report unlock。

### F. 回归验收

43. PASS 条件：Task 8A createBond 相关文件未改，功能不应受影响。
44. PASS 条件：Task 10B MyBondCard 相关文件未改，功能不应受影响。
45. PASS 条件：Task 10C ReportPaywall 相关文件未改，功能不应受影响。
46. PASS 条件：`/leaders/hl\_leader\_03` 页面正常 build。
47. PASS 条件：`/leaders/hl\_leader\_01` 页面正常 build。
48. PASS 条件：`/events` route 出现在 build 输出中。
49. PASS 条件：`npm run build` 通过。
50. PASS 条件：无 TypeScript 错误。
51. PASS 条件：无 ESLint 阻塞错误。

\---

## 5\. 输出格式

请输出：

1. Task 11 验收结果总览。
2. checklist 表格，包含：

   * `#`
   * 检查项
   * 状态 `PASS/FAIL`
   * 证据，例如文件名、行号、命令输出摘要
3. 如果全部通过，输出：

```text
Task 11: PASS
```

4. 如果有任何 FAIL：

   * 不要更新 `progress.md`
   * 明确列出失败项
   * 给出最小修复建议
   * 停止

\---

## 6\. 如果全部通过，更新 progress.md

如果且仅如果全部 checklist 通过，请更新：

`docs/superpowers/progress.md`

要求：

1. 将 Task 11 标记为 `COMPLETE ✅`。
2. 添加验收备注：

   * Events Page implemented
   * Reads BondVault / ReportPayment / RiskOracleAdapter events from Arc Testnet
   * Uses `getBlockNumber()` + chunked `getLogs`
   * Supports event tabs/filter, loading/error/empty states
   * Arcscan tx links included
   * build passed
3. Current Status 指向剩余未完成任务：

   * Task 9B: Home Page Demo Polish
   * Task 12: Integration + README

不要修改其他文件。

\---

## 7\. 最终输出

完成后输出：

```text
Task 11: PASS
```

并说明：

* `progress.md` 已更新
* 下一步建议进入 Task 9B，再进入 Task 12

