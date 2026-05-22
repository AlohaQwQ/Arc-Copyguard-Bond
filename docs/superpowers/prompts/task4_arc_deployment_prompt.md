# Task 4: Arc Testnet Deployment — 完整执行上下文

## 1. 目标

编写 Foundry 部署脚本，按正确依赖顺序将 4 个合约部署到 Arc Testnet（chain 5042002），注册 5 个 mock leader，授权 oracle 地址，输出部署地址到 JSON 文件。

## 2. 需要创建/修改的文件

| 操作 | 文件 |
|---|---|
| 创建 | `contracts/script/Deploy.s.sol` |
| 创建（模板） | `contracts/deployments.json` |
| 不修改 | `contracts/src/*`、`contracts/test/*`、`apps/*`、`agents/*` |

## 3. 部署顺序

```
1. LeaderRegistry()                        → 无参数
2. CopyGuardBondVault(leaderRegistry)      → 传入 #1 地址
3. RiskOracleAdapter(bondVault)            → 传入 #2 地址
4. BondVault.setRiskOracleAdapter(adapter) → 传入 #3 地址
5. ReportPayment()                         → 无参数
--- post-deploy ---
6. LeaderRegistry.registerLeader × 5       → 注册 mock leaders
7. RiskOracleAdapter.addOracle(oracleAddr)  → 授权后端 oracle
```

## 4. 需要的环境变量

从 `contracts/.env` 读取（**不要在对话中暴露私钥**）：

| 变量 | 用途 |
|---|---|
| `ARC_RPC_URL` | Arc Testnet RPC endpoint |
| `DEPLOYER_PRIVATE_KEY` | 部署者钱包私钥 |
| `ORACLE_ADDRESS` | FastAPI 后端的钱包地址（不是私钥），用于 addOracle |

## 5. 5 个 Mock Leaders 注册数据

| ID | Venue | Wallet | MetadataHash |
|---|---|---|---|
| `bytes32("hl_leader_01")` | "Hyperliquid" | `0x1111111111111111111111111111111111111111` | `bytes32(0)` |
| `bytes32("hl_leader_02")` | "Hyperliquid" | `0x2222222222222222222222222222222222222222` | `bytes32(0)` |
| `bytes32("hl_leader_03")` | "Hyperliquid" | `0x3333333333333333333333333333333333333333` | `bytes32(0)` |
| `bytes32("hl_leader_04")` | "Hyperliquid" | `0x4444444444444444444444444444444444444444` | `bytes32(0)` |
| `bytes32("hl_leader_05")` | "Hyperliquid" | `0x5555555555555555555555555555555555555555` | `bytes32(0)` |

## 6. Deployment JSON 输出格式

脚本应在部署完成后生成 `contracts/deployments.json`：

```json
{
  "chainId": 5042002,
  "network": "arc-testnet",
  "contracts": {
    "LeaderRegistry": "0x...",
    "CopyGuardBondVault": "0x...",
    "RiskOracleAdapter": "0x...",
    "ReportPayment": "0x..."
  },
  "oracleAddress": "0x..."
}
```

由于 Solidity 脚本无法直接写 JSON 文件，部署后**手动创建**该文件，填入实际地址即可。验收时会检查该文件存在且格式正确。

## 7. Codex 执行 Prompt

> 将以下内容完整粘贴给 Codex 执行。

---

你正在为 CopyGuard Bond 项目编写 Arc Testnet 部署脚本。

### 合约构造函数签名（基于实际实现）

- LeaderRegistry: constructor() — 无参数
- CopyGuardBondVault: constructor(address leaderRegistry_)
- RiskOracleAdapter: constructor(address bondVault_)
- ReportPayment: 无 constructor（部署时无参数）

### 后续调用（部署后）

- CopyGuardBondVault.setRiskOracleAdapter(address adapter) — onlyOwner
- LeaderRegistry.registerLeader(bytes32 id, string calldata venue, address wallet, bytes32 metadataHash) — onlyOwner
- RiskOracleAdapter.addOracle(address oracle) — onlyOwner

### 环境变量

从 .env 文件读取（使用 vm.envString / vm.envUint）：
- ARC_RPC_URL — Arc Testnet RPC URL
- DEPLOYER_PRIVATE_KEY — 部署者私钥
- ORACLE_ADDRESS — 后端 oracle 钱包地址（普通地址，不是私钥）

### 要求

#### 创建 contracts/script/Deploy.s.sol

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

#### 创建 contracts/deployments.json

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

#### 确认 foundry.toml 有 remappings

检查 contracts/foundry.toml，确保 @openzeppelin remapping 可用。如果 forge build 已经通过（当前状态），则不需要额外配置。

### 约束

- 不要修改 contracts/src/ 下的任何源文件
- 不要修改 contracts/test/ 下的任何测试文件
- 不要修改前端或后端代码
- 不要在代码中硬编码私钥
- .env 文件不应被提交到 git
- 不要执行实际的 forge script --broadcast（只创建脚本文件）

---

## 8. 验收 Checklist

| # | 检查项 | 验证方式 |
|---|---|---|
| 1 | `contracts/script/Deploy.s.sol` 存在 | `ls contracts/script/Deploy.s.sol` |
| 2 | `contracts/deployments.json` 存在且格式正确 | 检查 JSON 结构 |
| 3 | 部署顺序正确 | 读代码：LeaderRegistry → BondVault → Adapter → setAdapter → ReportPayment |
| 4 | 注册 5 个 mock leaders | 读代码：5 次 registerLeader 调用 |
| 5 | addOracle 调用存在 | 读代码：从 env 读取 ORACLE_ADDRESS |
| 6 | 私钥从 env 读取，无硬编码 | grep 脚本中无私钥字符串 |
| 7 | 支持 dry-run | `forge script script/Deploy.s.sol --rpc-url $URL` 编译通过 |
| 8 | forge build 仍然通过 | `cd contracts && forge build` |
| 9 | forge test 仍然全部通过 | `cd contracts && forge test` |
| 10 | 未修改源文件 | `git diff contracts/src/` 无变更 |
| 11 | 未修改测试文件 | `git diff contracts/test/` 无变更 |
| 12 | 未修改前端/后端 | `git diff apps/ agents/` 无变更 |
