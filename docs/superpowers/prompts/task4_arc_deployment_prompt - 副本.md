# Task 4: Arc Testnet Deployment — Codex Prompt

> 将以下内容完整粘贴给 Codex 执行。

---

你正在为 CopyGuard Bond 项目编写 Arc Testnet 部署脚本。

## 合约构造函数签名（基于实际实现）

- LeaderRegistry: constructor() — 无参数
- CopyGuardBondVault: constructor(address leaderRegistry_)
- RiskOracleAdapter: constructor(address bondVault_)
- ReportPayment: 无 constructor（部署时无参数）

## 后续调用（部署后）

- CopyGuardBondVault.setRiskOracleAdapter(address adapter) — onlyOwner
- LeaderRegistry.registerLeader(bytes32 id, string calldata venue, address wallet, bytes32 metadataHash) — onlyOwner
- RiskOracleAdapter.addOracle(address oracle) — onlyOwner

## 环境变量

从 .env 文件读取（使用 vm.envString / vm.envUint）：
- ARC_RPC_URL — Arc Testnet RPC URL
- DEPLOYER_PRIVATE_KEY — 部署者私钥
- ORACLE_ADDRESS — 后端 oracle 钱包地址（普通地址，不是私钥）

## 要求

### 创建 contracts/script/Deploy.s.sol

1. 使用 `pragma solidity ^0.8.24;`
2. import forge-std Script 和 4 个合约
3. 合约继承 Script
4. run() 函数执行以下步骤：
   a. 从 env 读取 DEPLOYER_PRIVATE_KEY，用 vm.startBroadcast(privateKey) 开始广播
   b. 部署 LeaderRegistry — new LeaderRegistry()
   c. 部署 CopyGuardBondVault — new CopyGuardBondVault(address(leaderRegistry))
   d. 部署 RiskOracleAdapter — new RiskOracleAdapter(address(bondVault))
   e. 调用 bondVault.setRiskOracleAdapter(address(adapter))
   f. 部署 ReportPayment — new ReportPayment()
   g. 注册 5 个 mock leaders:
      - bytes32("hl_leader_01"), "Hyperliquid", 0x1111111111111111111111111111111111111111, bytes32(0)
      - bytes32("hl_leader_02"), "Hyperliquid", 0x2222222222222222222222222222222222222222, bytes32(0)
      - bytes32("hl_leader_03"), "Hyperliquid", 0x3333333333333333333333333333333333333333, bytes32(0)
      - bytes32("hl_leader_04"), "Hyperliquid", 0x4444444444444444444444444444444444444444, bytes32(0)
      - bytes32("hl_leader_05"), "Hyperliquid", 0x5555555555555555555555555555555555555555, bytes32(0)
   h. 从 env 读取 ORACLE_ADDRESS，调用 adapter.addOracle(oracleAddress)
   i. vm.stopBroadcast()
   j. 用 console.log 输出每个合约的部署地址

5. 确保脚本可以通过以下命令执行：
   - Dry run: `forge script script/Deploy.s.sol --rpc-url $ARC_RPC_URL`
   - 实际部署: `forge script script/Deploy.s.sol --rpc-url $ARC_RPC_URL --broadcast`

### 创建 contracts/deployments.json

创建一个模板文件，结构如下：
```json
{
  "chainId": 5042002,
  "network": "arc-testnet",
  "contracts": {
    "LeaderRegistry": "",
    "CopyGuardBondVault": "",
    "RiskOracleAdapter": "",
    "ReportPayment": ""
  },
  "oracleAddress": ""
}
```
地址字段暂时留空，实际部署后手动填入。

### 确认 foundry.toml 有 remappings

检查 contracts/foundry.toml，确保 @openzeppelin remapping 可用。如果 forge build 已经通过（当前状态），则不需要额外配置。

## 约束

- 不要修改 contracts/src/ 下的任何源文件
- 不要修改 contracts/test/ 下的任何测试文件
- 不要修改前端或后端代码
- 不要在代码中硬编码私钥
- .env 文件不应被提交到 git
- 不要执行实际的 forge script --broadcast（只创建脚本文件）
