# 给 Claude Code / Superpowers 的 Task 8 Prompt 收敛指令

> 目的：让 Claude Code 基于现有 `docs/superpowers/prompts/task8\_nextjs\_wallet\_prompt.md` 进行收敛，而不是直接进入代码实现。

## 指令正文

请根据以下审查意见修正：

`docs/superpowers/prompts/task8\_nextjs\_wallet\_prompt.md`

目标：把当前 Task 8 收敛为 **Task 8A**，只完成前端基础、Reown 钱包连接、leaders/risk API 展示、leader detail、createBond 调用。不要合并 Task 9 / Task 10 的复杂内容。

本次只修改 prompt 文件，不写代码，不进入实现。

\---

## 一、为什么要收敛

当前 Task 8 prompt 范围过大，一次性包含：

* Reown / wagmi / viem 钱包集成
* 首页
* Leaders 列表
* Leader 详情
* Bond 创建
* MyBond 状态扫描
* 链上 Events getLogs
* paid report / x402 前端解锁
* UI polish

这已经超过 Task 8 的合理范围，容易导致 Codex 一次性改动过多、构建失败、Reown 集成不稳定、动态 hooks 违规、event logs 解码复杂化。

请将 Task 8 收敛为 **Task 8A：前端基础 + 钱包连接 + Leader API 展示 + createBond 最小闭环**。

\---

## 二、Task 8A 明确目标

Task 8A 只实现以下内容：

1. Next.js 前端基础页面结构；
2. Reown AppKit + wagmi + viem 基础配置；
3. Arc Testnet chain config；
4. Wallet connect UI；
5. `/leaders` 页面展示 FastAPI 的 5 个 leaders；
6. `/leaders/\[id]` 页面展示 leader detail + risk score；
7. `BondCreateModal` 或等价组件，调用 `CopyGuardBondVault.createBond`；
8. 创建 bond 成功后展示 txHash 和 Arcscan 链接；
9. `/events` 页面只做 placeholder / skeleton；
10. `npm run build` 必须通过。

\---

## 三、本次不做的内容

请从 Task 8 prompt 中移除或降级以下内容：

1. 不实现完整 MyBond 扫描；
2. 不在 Task 8 做真实链上 event getLogs；
3. 不实现 x402 report unlock flow；
4. 不实现完整 paid report 前端；
5. 不做复杂 dashboard polish；
6. 不引入大型动画库或大型 UI 框架；
7. 不要求真实读取所有历史链上事件；
8. 不要求调用后端 `run-risk-check`；
9. 不进入 Task 9；
10. 不进入 Task 10。

\---

## 四、额外修正与强约束

### 1\. 缩小 Task 8 范围

本 Task 只实现：

* 前端基础；
* Reown 钱包连接；
* leaders/risk API 展示；
* leader detail；
* createBond 调用。

首页视觉可以做基础版。  
Events 页面只做 placeholder/skeleton，不做真实 getLogs。  
不实现完整 MyBond 扫描，不实现 x402 unlock flow，不做复杂 paid report。

### 2\. Reown AppKit 集成方式必须修正

Reown AppKit 集成必须按当前官方 Next.js + Wagmi 模式：

* 使用 `@reown/appkit`；
* 使用 `@reown/appkit-adapter-wagmi`；
* 使用 `WagmiAdapter`；
* 在 client component 中调用 `createAppKit(...)` 初始化；
* 不要使用不存在或不稳定的 `<AppKit />` 组件；
* 连接按钮可以使用 `useAppKit().open()` 或 `AppKitButton`；
* metadata 必须包含 `name`、`description`、`url`、`icons`；
* defaultNetwork 设置为 `arcTestnet`。

### 3\. WalletConnect Project ID 缺失时不能导致 build 失败

如果 `NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID` 缺失：

* `npm run build` 不能失败；
* 页面应显示 `WalletConnect Project ID not configured` 的友好提示；
* Connect 按钮禁用或点击后提示配置项目 ID；
* 不要在模块顶层 `throw new Error(...)` 导致 build 失败。

### 4\. hooks 组织

请明确：

* `lib/api.ts` 只放 TypeScript types 和 fetcher；
* `hooks/use-leaders.ts` 只放 `useLeaders` / `useLeader` / `useRisk`；
* 不要重复定义相同 hooks。

### 5\. use-bonds.ts 范围

请明确：

* 不要在循环中动态调用 `useReadContract`；
* 如果未来需要读取多个 bond，应使用 `useReadContracts`；
* Task 8A 可以先只展示 createBond 成功后的 txHash；
* 不强制实现完整 user bonds 扫描；
* 如果保留 MyBond 区域，只做 skeleton / placeholder；
* 不要为了 MyBond 扫描引入复杂状态。

### 6\. use-events.ts 范围

请明确：

* Task 8A 只做 placeholder 或 mock event feed；
* 不要求真实 viem `getLogs`；
* 真实链上事件读取放后续 Task 10 / 集成阶段；
* `/events` 页面必须存在，但可以显示 `On-chain event stream coming next`。

### 7\. 合约 ABI

请明确：

* 不要从 `../../contracts/out` 动态导入 ABI；
* 在 `lib/contracts.ts` 中硬编码最小 ABI；
* 只包含本 Task 用到的函数：

  * `CopyGuardBondVault.createBond`
  * `CopyGuardBondVault.bonds`
  * `CopyGuardBondVault.nextBondId`
* `ReportPayment.purchaseReport`、`hasPurchased` 可先保留但不调用；
* 地址从 `NEXT\_PUBLIC\_\*` 环境变量读取；
* 地址缺失时 UI 友好报错，不让 build 失败。

### 8\. createBond 参数

请明确：

* `leaderId` 必须用 ASCII 右填充零转 `bytes32`；
* `riskThresholdBps` 默认 `7000`；
* `expiry` 默认当前时间 + 30 天；
* `value` 使用 `parseUnits(amount, 18)`；
* 不要假设 ERC20 `approve` / `transferFrom`；
* 成功后显示 txHash 和 Arcscan 链接；
* 不要调用后端 `run-risk-check`，本 Task 只创建 bond。

### 9\. Client Component 边界

请明确：

* 只有使用 hooks / wagmi / query 的组件加 `'use client'`；
* `app/layout.tsx` 保持 server component，以便 metadata 正常导出；
* `providers.tsx` 是 client component；
* 不要把整个 app 全部改成 client component。

### 10\. 禁止修改范围

请明确：

* 不修改 `contracts/`；
* 不修改 `agents/`；
* 不重新部署合约；
* 不修改部署 JSON；
* 不提交真实私钥；
* 不修改 `.env`；
* 不修改 `next.config.js`，除非当前 build 明确要求；
* 不进入 Task 9。

\---

## 五、Task 8A 验收标准调整

请把 Task 8 prompt 的验收标准调整为：

1. `npm run build` 通过；
2. 钱包连接组件可渲染；
3. `NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID` 缺失时 build 不失败；
4. `/` 路由存在；
5. `/leaders` 路由存在；
6. `/leaders/\[id]` 路由存在；
7. `/events` 路由存在，但允许 placeholder；
8. `/leaders` 能展示 FastAPI 的 5 个 leader；
9. `/leaders/\[id]` 能展示 risk score；
10. createBond 代码路径存在；
11. createBond 参数正确：

    * bytes32 leaderId；
    * riskThresholdBps；
    * expiry；
    * parseUnits(amount, 18)；
12. createBond 成功后显示 txHash 和 Arcscan 链接；
13. Events 页面允许 placeholder；
14. 不要求完整 MyBond 扫描；
15. 不要求真实 event logs；
16. 不要求 paid report unlock；
17. 不修改 `contracts/`；
18. 不修改 `agents/`；
19. 不修改 `next.config.js`，除非必须；
20. 不进入 Task 9。

\---

## 六、请 Claude Code 输出

修正完成后，请输出：

1. 修改后的 Task 8 prompt 文件路径；
2. 本次如何把 Task 8 收敛成 Task 8A；
3. 被移出 Task 8A 的内容；
4. 新增的强约束摘要；
5. 是否仍保持“不写代码，只改 prompt”。

最后停止，不要进入实现。

