# Task 10C 修复后代码验收 Prompt

将下面内容直接发送给 ClaudeCode，用于 **Task 10C 代码级验收**。

```text
继续当前 Superpowers 流程，进入 Task 10C 修复后代码验收。

不要重新恢复工作流。
不要读取无关历史 prompt。
不要进入 Task 11 / Task 9B / Task 12。
不要修改业务代码，除非发现明确阻塞验收的问题。
本轮目标只做 Task 10C 代码级验收；验收通过后只更新 docs/superpowers/progress.md。

## 1. 当前背景

Task 10C: ReportPaywall + x402 unlock flow 已由 Codex 实现并修复。

本次修复范围应仅限：

1. apps/web/components/report-paywall.tsx
2. apps/web/lib/api.ts

用户已完成运行时验证：

1. 后端未带 headers 请求：

   GET http://127.0.0.1:8000/api/reports/hl\_leader\_03

   返回 402，且 body 包含完整字段：
   - price
   - priceHuman
   - recipient
   - resource
   - chainId
   - contractAddress
   - instructions

2. 使用成功 payment txHash + wallet headers 请求：

   X-Payment-Tx-Hash:
   0xdd8c07b6cf938f6dfbd9972c5ff7ffed93be43d9103ab51bfedcd843e02d69f5

   X-Wallet-Address:
   0x613A7C4093D77633c30C5445dC6C9B966378209B

   GET http://127.0.0.1:8000/api/reports/hl\_leader\_03

   返回完整 report：
   - leaderId = hl\_leader\_03
   - riskScoreBps = 7267
   - action = EXIT
   - confidenceBps = 7500
   - reasons
   - reportHash

3. 前端写入成功 txHash 到 localStorage 后刷新，能自动展示 Unlocked Report / Full Risk Report。

4. 写入失败 txHash 或链上重复购买失败时，前端不解锁 report，而是显示错误：
   - transaction failed
   - 或 This report appears to have already been purchased by this wallet...

5. Clear saved payment 会清除当前 wallet + leader 的 localStorage key，并恢复 locked/paywall 状态。

## 2. 需要读取的文件

请读取并检查以下文件：

1. apps/web/components/report-paywall.tsx
2. apps/web/lib/api.ts
3. apps/web/app/leaders/\[id]/page.tsx
4. apps/web/lib/contracts.ts
5. apps/web/components/bond-create-modal.tsx
6. apps/web/components/my-bond-card.tsx
7. docs/superpowers/progress.md

只需要读取这些文件。不要读取无关历史 prompt。

## 3. 需要运行的命令

在项目根目录运行：

```bash
git diff --stat contracts
git diff --stat agents
git diff --stat apps/web/next.config.js
git diff --stat apps/web/lib/contracts.ts
git diff --stat apps/web/components/bond-create-modal.tsx
git diff --stat apps/web/components/my-bond-card.tsx
```

预期：以上命令无输出。

然后运行：

```bash
cd apps/web \&\& npm run build
```

预期：build 通过。允许出现此前已存在的 Reown/Wagmi warning，只要不阻塞 build。

## 4\. Task 10C 验收 checklist

基于 docs\\superpowers\\prompts\\task10c-report-paywall-prompt-revised.md 文件中验收 checklist 段落进行验收，并且结合下面内容逐项验收，并输出 PASS/FAIL 表格。

### A. 文件范围

1. PASS 条件：本次功能变更只涉及：

   * apps/web/components/report-paywall.tsx
   * apps/web/lib/api.ts
   * 如 page.tsx 有 Task 10C 早期集成变更，应仅限把 ReportPaywall 接入 leader detail 页面。
2. PASS 条件：未修改 contracts/。
3. PASS 条件：未修改 agents/。
4. PASS 条件：未修改 apps/web/next.config.js。
5. PASS 条件：未修改 apps/web/lib/contracts.ts。
6. PASS 条件：未修改 apps/web/components/bond-create-modal.tsx。
7. PASS 条件：未修改 apps/web/components/my-bond-card.tsx。

### B. api.ts 验收

8. PASS 条件：fetchReport 支持正常 unlocked report 返回。
9. PASS 条件：fetchReport 支持 402 paywall 返回，并保留以下字段：

   * status
   * message
   * price
   * priceHuman
   * recipient
   * resource
   * chainId
   * contractAddress
   * instructions
   * verificationError，如存在
10. PASS 条件：fetchReport 支持带 headers：

    * X-Payment-Tx-Hash
    * X-Wallet-Address
11. PASS 条件：网络错误或非预期响应不会导致页面崩溃，而是能被 ReportPaywall 展示为错误状态。

### C. ReportPaywall 状态机验收

12. PASS 条件：writeContractAsync 返回 txHash 后，不会立即写入 localStorage。
13. PASS 条件：存在 pendingPaymentTxHash / verifiedPaymentTxHash / failedPaymentTxHash / savedPaymentTxHash 或等价状态拆分。
14. PASS 条件：只有在链上 receipt success 且后端 fetchReport 返回 unlocked report 后，才写入 localStorage。
15. PASS 条件：receipt failed / reverted / 用户拒签 / 钱包错误时，不写 localStorage。
16. PASS 条件：失败 txHash 不会被当作 verified payment 缓存。
17. PASS 条件：失败状态会显示明确错误信息，不会永久卡在 Waiting for confirmation。
18. PASS 条件：如果错误包含 report already purchased，会显示友好提示，说明该 report 已被当前钱包购买过，应使用原始成功 payment txHash 或清除失败缓存后重新验证。
19. PASS 条件：Clear saved payment 会删除当前 wallet + leader 对应的 localStorage key，并重置 UI state。
20. PASS 条件：Clear saved payment 后会回到 locked/paywall 状态，不继续使用旧 txHash 验证。
21. PASS 条件：刷新页面时，如果 localStorage 中存在成功 payment txHash，会自动带 X-Payment-Tx-Hash / X-Wallet-Address 请求后端并解锁 report。
22. PASS 条件：刷新页面时，如果 localStorage 中存在失败 txHash，不会解锁 report，会显示错误并提供 Clear saved payment。
23. PASS 条件：未连接钱包时，页面不崩溃，显示合理的 paywall / connect wallet 提示。

### D. 402 配置验收

24. PASS 条件：402 response 中完整展示：

    * priceHuman 或 price
    * recipient
    * chainId
    * contractAddress
    * instructions
25. PASS 条件：如果 402 response 中 contractAddress / recipient / chainId / price 任一缺失，会禁用付款按钮，并显示配置不完整错误。
26. PASS 条件：如果 verificationError 为 report payment contract is not configured，会禁用付款按钮，并提示需要配置 REPORT\_PAYMENT\_ADDRESS 后重启 FastAPI。
27. PASS 条件：当前正常 402 body 中 contractAddress 不为空，且等于：
0x15832FA84424E257ACf3735e905E9a5d3B33ee82

### E. Unlocked Report UI 验收

28. PASS 条件：成功解锁后展示完整 Full Risk Report。
29. PASS 条件：Unlocked Report UI 展示：

    * leaderId
    * riskScoreBps
    * action
    * confidenceBps
    * reasons
    * recommendedAllocationBps，如存在
    * degradationDetected，如存在
    * bondAction，如存在
    * reportHash
    * txHash，如存在
    * paymentTxHash
30. PASS 条件：paymentTxHash 展示 Arcscan 链接。
31. PASS 条件：reportHash 完整值可见或可复制，不只显示截断值。
32. PASS 条件：失败状态不展示 unlocked report。

### F. 回归验收

33. PASS 条件：Task 8A createBond 不受影响。
34. PASS 条件：Task 10B MyBondCard 不受影响。
35. PASS 条件：/leaders/hl\_leader\_03 页面正常。
36. PASS 条件：/leaders/hl\_leader\_01 页面正常。
37. PASS 条件：/events placeholder 正常。
38. PASS 条件：npm run build 通过。

## 5\. 输出格式

请输出：

1. Task 10C 验收结果总览。
2. 一张 checklist 表格，包含：

   * # 
   * 检查项
   * 状态 PASS/FAIL
   * 证据，例如文件名、行号、命令输出摘要
3. 如果全部通过，输出：

Task 10C: PASS

4. 如果有任何 FAIL：

   * 不要更新 progress.md
   * 明确列出失败项
   * 给出最小修复建议
   * 停止

## 6\. 如果全部通过，更新 progress.md

如果且仅如果全部 checklist 通过，请更新：

docs/superpowers/progress.md

要求：

1. 将 Task 10C 标记为 COMPLETE ✅。
2. 添加验收备注：

   * ReportPaywall x402 unlock flow complete
   * 成功 payment txHash 可解锁 report
   * 失败/reverted txHash 不写入 localStorage
   * Clear saved payment 可恢复 locked/paywall
   * build passed
3. Current Status 指向下一个未完成任务：

   * Task 11 Events Page
   * Task 9B Home Page Demo Polish
   * Task 12 Integration + README

不要修改其他文件。

## 7\. 最终输出

完成后输出：

Task 10C: PASS

并说明：

* progress.md 已更新
* 下一步建议进入 Task 11 / Task 9B / Task 12

```

