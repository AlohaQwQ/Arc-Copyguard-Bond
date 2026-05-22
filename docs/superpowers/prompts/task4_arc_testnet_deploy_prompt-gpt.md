# Task 4: Arc Testnet Deployment — 执行上下文与 Codex Prompt

## 0\. 当前阶段

前置任务状态：

* Task 1 Repo Scaffold：已完成
* Task 2 Smart Contracts：已完成并通过验收
* Task 3 Contract Tests：已完成，`cd contracts \&\& forge test -vvv` 结果为 `27 passed, 0 failed, 0 skipped`

当前任务目标：

> 编写 Foundry 部署脚本，按正确依赖顺序将 4 个合约部署到 Arc Testnet，并注册 5 个 mock leaders、授权 oracle 地址、输出部署地址模板。

注意：本任务只创建部署脚本和部署地址模板，不执行真实 broadcast。

\---

## 1\. Task 4 目标

编写 Foundry 部署脚本，部署以下 4 个合约：

1. `LeaderRegistry`
2. `CopyGuardBondVault`
3. `RiskOracleAdapter`
4. `ReportPayment`

并在部署脚本中完成：

1. `CopyGuardBondVault.setRiskOracleAdapter(adapter)`
2. `LeaderRegistry.registerLeader(...) × 5`
3. `RiskOracleAdapter.addOracle(ORACLE\_ADDRESS)`
4. `console2.log` 输出部署地址

Arc Testnet 信息：

* Network: `arc-testnet`
* Chain ID: `5042002`
* RPC: `https://rpc.testnet.arc.network`
* Gas token: native USDC

\---

## 2\. 需要创建或修改的文件

|操作|文件|说明|
|-|-|-|
|创建|`contracts/script/Deploy.s.sol`|Foundry 部署脚本，脚本合约名为 `Deploy`|
|创建|`contracts/deployments/arc-testnet.example.json`|部署结果模板，不填真实地址|
|修改|`contracts/.env.example`|增加 `ORACLE\_ADDRESS=your\_oracle\_address\_here`|
|不修改|`contracts/src/\*`|不允许修改合约源码|
|不修改|`contracts/test/\*`|不允许修改测试|
|不修改|`apps/\*`|不允许修改前端|
|不修改|`agents/\*`|不允许修改后端|

可选：如果 `contracts/deployments/` 不存在，请创建该目录。

\---

## 3\. 部署顺序

必须严格按以下顺序部署和调用：

```text
1. LeaderRegistry()
2. CopyGuardBondVault(address(leaderRegistry))
3. RiskOracleAdapter(address(bondVault))
4. CopyGuardBondVault.setRiskOracleAdapter(address(adapter))
5. ReportPayment()
6. LeaderRegistry.registerLeader(...) × 5
7. RiskOracleAdapter.addOracle(oracleAddress)
```

这个顺序是为了避免合约之间出现循环依赖：

* `BondVault` 构造函数只需要 `LeaderRegistry` 地址；
* `RiskOracleAdapter` 构造函数需要 `BondVault` 地址；
* `BondVault` 的 adapter 地址通过部署后的 `setRiskOracleAdapter` 设置。

\---

## 4\. 环境变量

真实部署时使用本地 `contracts/.env` 或 PowerShell 环境变量。

**不要把私钥粘贴到 Claude、Codex、ChatGPT 或任何 prompt 中。**

需要的变量：

|变量|类型|用途|
|-|-|-|
|`ARC\_RPC\_URL`|string|Arc Testnet RPC URL|
|`DEPLOYER\_PRIVATE\_KEY`|uint / hex private key|部署者私钥，只在本地使用|
|`ORACLE\_ADDRESS`|address|FastAPI 后端 oracle 钱包地址，不是私钥|

`contracts/.env.example` 应包含：

```env
# Arc Testnet
ARC\_RPC\_URL=https://rpc.testnet.arc.network
DEPLOYER\_PRIVATE\_KEY=your\_deployer\_private\_key\_here
ORACLE\_ADDRESS=your\_oracle\_address\_here
```

PowerShell 不会自动把 `.env` 注入到 `$env:\*`。如果要在 PowerShell 中执行命令，需要手动设置：

```powershell
cd D:\\Work\\Development\\AI\\ClaudeCode\\Agora\\contracts
$env:ARC\_RPC\_URL="https://rpc.testnet.arc.network"
$env:DEPLOYER\_PRIVATE\_KEY="你的测试钱包私钥，不要发给 AI"
$env:ORACLE\_ADDRESS="你的 oracle 钱包地址"
```

也可以在 Foundry script 中通过 `vm.envUint("DEPLOYER\_PRIVATE\_KEY")` 和 `vm.envAddress("ORACLE\_ADDRESS")` 读取环境变量。

\---

## 5\. Mock Leaders 注册数据

部署脚本中注册以下 5 个 mock leaders：

|ID|Venue|Wallet|MetadataHash|
|-|-|-|-|
|`bytes32("hl\_leader\_01")`|`"Hyperliquid"`|`0x1111111111111111111111111111111111111111`|`bytes32(0)`|
|`bytes32("hl\_leader\_02")`|`"Hyperliquid"`|`0x2222222222222222222222222222222222222222`|`bytes32(0)`|
|`bytes32("hl\_leader\_03")`|`"Hyperliquid"`|`0x3333333333333333333333333333333333333333`|`bytes32(0)`|
|`bytes32("hl\_leader\_04")`|`"Hyperliquid"`|`0x4444444444444444444444444444444444444444`|`bytes32(0)`|
|`bytes32("hl\_leader\_05")`|`"Hyperliquid"`|`0x5555555555555555555555555555555555555555`|`bytes32(0)`|

\---

## 6\. Deployment JSON 模板

创建模板文件：

```text
contracts/deployments/arc-testnet.example.json
```

模板内容：

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

真实部署成功后，由用户手动创建：

```text
contracts/deployments/arc-testnet.json
```

并填入真实地址。

不要让部署脚本自动写 JSON 文件。部署脚本只负责 `console2.log` 输出地址。

\---

# Codex Prompt

将以下内容完整粘贴给 Codex 执行。

\---

你正在为 CopyGuard Bond 项目编写 Task 4: Arc Testnet Deployment。

请先读取并严格遵守：

1. `docs/superpowers/specs/2026-05-19-copyguard-bond-p0-design.md`
2. `docs/superpowers/plans/copyguard-bond-p0-execution-plan.md`
3. `contracts/src/LeaderRegistry.sol`
4. `contracts/src/CopyGuardBondVault.sol`
5. `contracts/src/RiskOracleAdapter.sol`
6. `contracts/src/ReportPayment.sol`

当前任务只允许创建部署脚本和部署地址模板。不要执行真实部署。

## 当前任务目标

创建 Foundry 部署脚本，将以下 4 个合约按正确顺序部署到 Arc Testnet：

1. `LeaderRegistry`
2. `CopyGuardBondVault`
3. `RiskOracleAdapter`
4. `ReportPayment`

部署后完成：

1. `bondVault.setRiskOracleAdapter(address(adapter))`
2. `leaderRegistry.registerLeader(...) × 5`
3. `adapter.addOracle(oracleAddress)`
4. `console2.log` 输出所有部署地址

## 需要创建或修改的文件

只能创建或修改以下文件：

1. `contracts/script/Deploy.s.sol`
2. `contracts/deployments/arc-testnet.example.json`
3. `contracts/.env.example`

不得修改：

1. `contracts/src/\*`
2. `contracts/test/\*`
3. `apps/\*`
4. `agents/\*`
5. `contracts/script/` 下除 `Deploy.s.sol` 之外的其他文件

如果 `contracts/deployments/` 不存在，请创建该目录。

## 部署脚本要求

请创建：

```text
contracts/script/Deploy.s.sol
```

脚本合约名必须是：

```solidity
contract Deploy is Script
```

### 代码要求

1. 使用 `pragma solidity ^0.8.24;`
2. import `forge-std/Script.sol`
3. import `forge-std/console2.sol`
4. import 4 个项目合约：

   * `../src/LeaderRegistry.sol`
   * `../src/CopyGuardBondVault.sol`
   * `../src/RiskOracleAdapter.sol`
   * `../src/ReportPayment.sol`
5. `run()` 函数中读取：

   * `uint256 deployerPrivateKey = vm.envUint("DEPLOYER\_PRIVATE\_KEY");`
   * `address oracleAddress = vm.envAddress("ORACLE\_ADDRESS");`
6. 检查：

   * `require(block.chainid == 5042002, "wrong chain");`
   * `require(oracleAddress != address(0), "invalid oracle");`
7. 使用 `vm.startBroadcast(deployerPrivateKey)` 开始广播。
8. 按以下顺序部署和调用：

   * `LeaderRegistry leaderRegistry = new LeaderRegistry();`
   * `CopyGuardBondVault bondVault = new CopyGuardBondVault(address(leaderRegistry));`
   * `RiskOracleAdapter adapter = new RiskOracleAdapter(address(bondVault));`
   * `bondVault.setRiskOracleAdapter(address(adapter));`
   * `ReportPayment reportPayment = new ReportPayment();`
   * 注册 5 个 mock leaders。
   * `adapter.addOracle(oracleAddress);`
9. 使用 `vm.stopBroadcast()` 结束广播。
10. 使用 `console2.log` 输出：

    * chain id
    * deployer address，可通过 `vm.addr(deployerPrivateKey)` 计算
    * oracle address
    * LeaderRegistry 地址
    * CopyGuardBondVault 地址
    * RiskOracleAdapter 地址
    * ReportPayment 地址

### 5 个 mock leaders

部署脚本必须注册：

```solidity
leaderRegistry.registerLeader(
    bytes32("hl\_leader\_01"),
    "Hyperliquid",
    0x1111111111111111111111111111111111111111,
    bytes32(0)
);
```

并依次注册：

```text
hl\_leader\_01 → 0x1111111111111111111111111111111111111111
hl\_leader\_02 → 0x2222222222222222222222222222222222222222
hl\_leader\_03 → 0x3333333333333333333333333333333333333333
hl\_leader\_04 → 0x4444444444444444444444444444444444444444
hl\_leader\_05 → 0x5555555555555555555555555555555555555555
```

每个 leader 的 venue 都是 `"Hyperliquid"`，metadataHash 都是 `bytes32(0)`。

可以写成 helper function，减少重复代码。

## .env.example 要求

请修改 `contracts/.env.example`，确保包含：

```env
# Arc Testnet
ARC\_RPC\_URL=https://rpc.testnet.arc.network
DEPLOYER\_PRIVATE\_KEY=your\_deployer\_private\_key\_here
ORACLE\_ADDRESS=your\_oracle\_address\_here
```

注意：

* 不要创建真实 `.env`。
* 不要提交真实私钥。
* 不要在任何文件中硬编码私钥。

## Deployment example JSON 要求

请创建：

```text
contracts/deployments/arc-testnet.example.json
```

内容必须是合法 JSON：

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

不要创建 `contracts/deployments/arc-testnet.json`。真实部署后由用户手动创建并填入真实地址。

## Foundry 命令要求

部署脚本必须可以通过以下命令进行 dry-run：

```powershell
cd D:\\Work\\Development\\AI\\ClaudeCode\\Agora\\contracts
forge script script/Deploy.s.sol:Deploy --rpc-url https://rpc.testnet.arc.network
```

如果用户在 PowerShell 中设置了环境变量，也可以用：

```powershell
forge script script/Deploy.s.sol:Deploy --rpc-url $env:ARC\_RPC\_URL
```

真实部署命令应为：

```powershell
forge script script/Deploy.s.sol:Deploy --rpc-url $env:ARC\_RPC\_URL --broadcast
```

但你不能执行 `--broadcast`。

## 验证命令

完成后请运行：

```powershell
cd D:\\Work\\Development\\AI\\ClaudeCode\\Agora\\contracts
forge build
forge test
forge script script/Deploy.s.sol:Deploy --rpc-url https://rpc.testnet.arc.network
```

如果 `forge script` dry-run 因为没有本地 `DEPLOYER\_PRIVATE\_KEY` 或 `ORACLE\_ADDRESS` 环境变量而失败，请不要猜测私钥或地址。

在这种情况下，请报告：

```text
Deploy script compiles, but dry-run requires local DEPLOYER\_PRIVATE\_KEY and ORACLE\_ADDRESS environment variables.
```

可以先通过 `forge build` 和 `forge test` 作为基本验收。

## 约束

1. 不要修改 `contracts/src/` 下的任何源文件。
2. 不要修改 `contracts/test/` 下的任何测试文件。
3. 不要修改 `apps/` 或 `agents/`。
4. 不要硬编码私钥。
5. 不要创建真实 `.env`。
6. 不要执行 `forge script --broadcast`。
7. 不要创建 `contracts/deployments/arc-testnet.json`。
8. 只创建模板 `contracts/deployments/arc-testnet.example.json`。
9. 如果需要从 sample/ 参考，只能只读参考，不要复制与当前 spec 冲突的逻辑。
10. 优先级：项目 spec > execution plan > sample 代码。

## 验收 Checklist

请确保以下检查项满足：

1. `contracts/script/Deploy.s.sol` 存在。
2. 部署脚本合约名为 `Deploy`。
3. 部署脚本使用 `vm.envUint("DEPLOYER\_PRIVATE\_KEY")`。
4. 部署脚本使用 `vm.envAddress("ORACLE\_ADDRESS")`。
5. 部署脚本包含 `require(block.chainid == 5042002, "wrong chain")`。
6. 部署脚本包含 `require(oracleAddress != address(0), "invalid oracle")`。
7. 部署顺序正确：

   * LeaderRegistry
   * CopyGuardBondVault
   * RiskOracleAdapter
   * setRiskOracleAdapter
   * ReportPayment
8. 部署脚本注册 5 个 mock leaders。
9. 部署脚本调用 `adapter.addOracle(oracleAddress)`。
10. 部署脚本使用 `console2.log` 输出所有地址。
11. `contracts/deployments/arc-testnet.example.json` 存在且是合法 JSON。
12. `contracts/.env.example` 包含 `ORACLE\_ADDRESS=your\_oracle\_address\_here`。
13. `forge build` 通过。
14. `forge test` 通过。
15. `git diff contracts/src/` 无变更。
16. `git diff contracts/test/` 无变更。
17. `git diff apps/ agents/` 无变更。
18. 没有创建真实 `.env`。
19. 没有执行 `--broadcast`。

## 最终输出要求

完成后请总结：

1. 创建或修改了哪些文件；
2. 部署脚本的部署顺序；
3. 是否加入 chainId 检查；
4. 是否从 env 读取 deployer private key 和 oracle address；
5. 是否注册 5 个 mock leaders；
6. 是否调用 addOracle；
7. `forge build` 是否通过；
8. `forge test` 是否通过；
9. `forge script` dry-run 是否通过；
10. 是否修改了 `contracts/src/`；
11. 是否修改了 `contracts/test/`；
12. 是否修改了 `apps/` 或 `agents/`；
13. 是否有任何需要用户手动完成的事项，例如设置本地环境变量或部署后填写 `arc-testnet.json`。

```

