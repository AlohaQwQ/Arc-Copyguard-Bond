&#x20;Task 3: Contract Tests — 执行上下文



&#x20; 1. 目标



&#x20; 为 4 个已实现的合约编写 Foundry 测试，覆盖 bond 完整生命周期、支付校验、权限控制和状态转换。测试通过后合约才可部署。



&#x20; 2. 测试文件



&#x20; ┌─────────────────────────────────────────┬────────────────────┐

&#x20; │                  文件                   │      覆盖合约      │

&#x20; ├─────────────────────────────────────────┼────────────────────┤

&#x20; │ contracts/test/LeaderRegistry.t.sol     │ LeaderRegistry     │

&#x20; ├─────────────────────────────────────────┼────────────────────┤

&#x20; │ contracts/test/CopyGuardBondVault.t.sol │ CopyGuardBondVault │

&#x20; ├─────────────────────────────────────────┼────────────────────┤

&#x20; │ contracts/test/RiskOracleAdapter.t.sol  │ RiskOracleAdapter  │

&#x20; ├─────────────────────────────────────────┼────────────────────┤

&#x20; │ contracts/test/ReportPayment.t.sol      │ ReportPayment      │

&#x20; └─────────────────────────────────────────┴────────────────────┘



&#x20; 3. 每个文件的测试用例



&#x20; LeaderRegistry.t.sol（4 cases）:

&#x20; - registerLeader 存储正确数据

&#x20; - getActiveLeaders 返回已注册的 leader 列表

&#x20; - deactivateLeader 设置 active=false 并从列表移除

&#x20; - 非 owner 调用 registerLeader revert



&#x20; CopyGuardBondVault.t.sol（13 cases）:

&#x20; - createBond with msg.value=1e18 → emit BondCreated, state Active, amount=1e18

&#x20; - createBond with msg.value=0 → revert

&#x20; - submitRiskUpdate（通过 adapter 调用）→ 更新 lastRiskScoreBps + lastReportHash, emit RiskUpdated

&#x20; - risk score > threshold → 自动转入 Warned, emit BondWarned

&#x20; - risk score <= threshold → 保持 Active

&#x20; - 直接调用 BondVault.submitRiskUpdate（不通过 adapter）→ revert

&#x20; - slashBond 扣减正确金额, emit BondSlashed, state=Slashed

&#x20; - refundBond in Active → 退款到 follower, state=Refunded

&#x20; - refundBond in Warned → 同上

&#x20; - refundBond in Slashed → revert

&#x20; - settleBond 未到 expiry → revert

&#x20; - settleBond 到期后（vm.warp）→ state=Settled

&#x20; - 非 owner 调用 slashBond → revert



&#x20; RiskOracleAdapter.t.sol（4 cases）:

&#x20; - addOracle 授权地址

&#x20; - removeOracle 取消授权

&#x20; - 已授权 oracle 可调用 submitRiskUpdate 并转发到 BondVault

&#x20; - 未授权地址调用 submitRiskUpdate → revert



&#x20; ReportPayment.t.sol（4 cases）:

&#x20; - purchaseReport with msg.value=1e18 → emit ReportPurchased, hasPurchased=true

&#x20; - purchaseReport with msg.value=0 → revert

&#x20; - purchaseReport with msg.value=2e18 → revert

&#x20; - 重复 purchaseReport → revert



&#x20; 4. 特别注意的合约行为



&#x20; 这些是从 Task 2 实际代码中提取的关键约束，测试必须对齐：



&#x20; - 部署顺序：LeaderRegistry → BondVault(leaderRegistry) → RiskOracleAdapter(bondVault) →

&#x20; BondVault.setRiskOracleAdapter(adapter) → ReportPayment

&#x20; - BondVault.nextBondId 从 1 开始（非 0），第一个 bond ID = 1

&#x20; - createBond 前必须注册 leader：BondVault 通过 ILeaderRegistry 接口检查 leader.active

&#x20; - submitRiskUpdate 只接受 Active 或 Warned 状态的 bond

&#x20; - auto-warn 只在 state == Active 时触发：如果已经 Warned，再次提交高风险不会重复 emit BondWarned

&#x20; - refundBond 权限：owner 或 bond.follower 均可调用

&#x20; - settleBond 要求 state == Active || Warned：已 Slashed/Refunded 的不能 settle

&#x20; - slashBond 转账给 owner()（不是 address(this)）

&#x20; - ReportPayment 无 owner：纯支付记录合约

&#x20; - BondVault.\_requireExistingBond 检查 bond.id != 0：不存在的 bondId 会 revert

&#x20; - 使用 deal() 给测试地址注入 native USDC

&#x20; - 使用 vm.warp() 推进时间测试 expiry

&#x20; - 使用 vm.prank() 模拟不同调用者

&#x20; - vm.expectRevert 验证 revert 消息



&#x20; 5. Codex Prompt



&#x20; 你正在为 CopyGuard Bond 项目编写 Foundry 合约测试。合约源码在 contracts/src/

&#x20; 下。请严格按照实际合约接口编写测试，不要假设不存在的函数。



&#x20; ## 合约接口摘要（基于实际实现）



&#x20; LeaderRegistry.sol:

&#x20; - constructor() — 无参数

&#x20; - registerLeader(bytes32 id, string calldata venue, address wallet, bytes32 metadataHash) external onlyOwner

&#x20; - deactivateLeader(bytes32 id) external onlyOwner

&#x20; - getLeader(bytes32 id) external view returns (Leader memory)

&#x20; - getActiveLeaders() external view returns (bytes32\[] memory)

&#x20; - Leader struct: {bytes32 id, string venue, address wallet, bytes32 metadataHash, bool active}

&#x20; - event LeaderRegistered(bytes32 indexed id, string venue, address indexed wallet, bytes32 metadataHash)

&#x20; - event LeaderDeactivated(bytes32 indexed id)



&#x20; CopyGuardBondVault.sol:

&#x20; - constructor(address leaderRegistry\_)

&#x20; - setRiskOracleAdapter(address adapter) external onlyOwner

&#x20; - createBond(bytes32 leaderId, uint16 riskThresholdBps, uint256 expiry) external payable nonReentrant

&#x20; - submitRiskUpdate(uint256 bondId, uint16 riskScoreBps, bytes32 reportHash) external onlyRiskOracle

&#x20; - triggerWarning(uint256 bondId) external onlyRiskOracle

&#x20; - slashBond(uint256 bondId, uint16 slashBps) external onlyOwner nonReentrant

&#x20; - refundBond(uint256 bondId) external nonReentrant — owner 或 follower 可调用

&#x20; - settleBond(uint256 bondId) external onlyOwner

&#x20; - nextBondId 从 1 开始

&#x20; - createBond 要求: msg.value > 0, riskThresholdBps <= 10000, expiry > block.timestamp, leader active

&#x20; - submitRiskUpdate 要求: bond state Active 或 Warned; risk > threshold + Active → auto Warned

&#x20; - slashBond: 计算 slashedAmount = bond.amount \* slashBps / 10000, 转给 owner(), state = Slashed

&#x20; - refundBond: Active 或 Warned 可退, 转给 follower, state = Refunded

&#x20; - settleBond: block.timestamp >= expiry, state Active 或 Warned, state = Settled



&#x20; RiskOracleAdapter.sol:

&#x20; - constructor(address bondVault\_)

&#x20; - addOracle(address oracle) external onlyOwner

&#x20; - removeOracle(address oracle) external onlyOwner

&#x20; - submitRiskUpdate(uint256 bondId, uint16 riskScoreBps, bytes32 reportHash) external — 要求 isAuthorizedOracle

&#x20; - 转发到 IBondVault(bondVault).submitRiskUpdate()



&#x20; ReportPayment.sol:

&#x20; - REPORT\_FEE = 1e18 (constant)

&#x20; - purchaseReport(bytes32 leaderId) external payable — msg.value == REPORT\_FEE, 不允许重复

&#x20; - hasPurchased(address, bytes32) public view returns (bool)

&#x20; - event ReportPurchased(address indexed user, bytes32 indexed leaderId, uint256 amount, uint256 timestamp)



&#x20; ## 测试文件和测试用例



&#x20; ### contracts/test/LeaderRegistry.t.sol (4 tests)

&#x20; 1. testRegisterLeader — 注册 leader，验证数据正确

&#x20; 2. testGetActiveLeaders — 返回所有活跃 leader

&#x20; 3. testDeactivateLeader — 停用后 active=false，列表中移除

&#x20; 4. testRevertNonOwnerRegister — 非 owner 调用 revert



&#x20; ### contracts/test/CopyGuardBondVault.t.sol (13 tests)

&#x20; setUp: 部署 LeaderRegistry → BondVault → RiskOracleAdapter → setRiskOracleAdapter → 注册一个测试 leader (bytes32("leader\_01"),

&#x20;  "Hyperliquid", makeAddr("leader"), bytes32(0))



&#x20; 1. testCreateBond — msg.value=1e18, threshold=7000, expiry=block.timestamp+30 days → emit BondCreated,

&#x20; bond.follower=msg.sender, bond.amount=1e18, bond.state=Active

&#x20; 2. testRevertCreateBondZeroValue — msg.value=0 → revert "amount required"

&#x20; 3. testSubmitRiskUpdate — 通过 adapter.submitRiskUpdate → bond.lastRiskScoreBps 更新, lastReportHash 更新, emit RiskUpdated

&#x20; 4. testAutoWarnOnHighRisk — risk=8000 > threshold=7000 → state Warned, emit BondWarned

&#x20; 5. testNoWarnOnLowRisk — risk=5000 < threshold=7000 → 保持 Active

&#x20; 6. testRevertDirectSubmitRiskUpdate — 直接调用 BondVault.submitRiskUpdate（不通过 adapter）→ revert "not risk oracle"

&#x20; 7. testSlashBond — slashBps=5000 → 扣减一半金额, state=Slashed, emit BondSlashed, owner 收到 slashedAmount

&#x20; 8. testRefundBondActive — state Active 时退款, follower 收到全额, state=Refunded, emit BondRefunded

&#x20; 9. testRefundBondWarned — state Warned 时退款成功

&#x20; 10. testRevertRefundBondSlashed — state Slashed 时 revert "bond not refundable"

&#x20; 11. testRevertSettleBondBeforeExpiry — 未到期 settle → revert

&#x20; 12. testSettleBondAfterExpiry — vm.warp 到 expiry 之后 → state=Settled, emit BondSettled

&#x20; 13. testRevertNonOwnerSlashBond — 非 owner 调用 slashBond → revert



&#x20; ### contracts/test/RiskOracleAdapter.t.sol (4 tests)

&#x20; setUp: 部署 LeaderRegistry → BondVault → RiskOracleAdapter → setRiskOracleAdapter → 注册 leader



&#x20; 1. testAddOracle — addOracle 后 isAuthorizedOracle\[oracle] == true

&#x20; 2. testRemoveOracle — removeOracle 后 isAuthorizedOracle\[oracle] == false

&#x20; 3. testAuthorizedOracleSubmitRiskUpdate — 已授权 oracle 调用 → 转发到 BondVault, BondVault bond 更新

&#x20; 4. testRevertUnauthorizedSubmitRiskUpdate — 未授权地址 → revert "oracle not authorized"



&#x20; ### contracts/test/ReportPayment.t.sol (4 tests)

&#x20; 1. testPurchaseReport — msg.value=1e18 → emit ReportPurchased, hasPurchased\[user]\[leaderId]==true

&#x20; 2. testRevertPurchaseReportZeroValue — msg.value=0 → revert "invalid report fee"

&#x20; 3. testRevertPurchaseReportWrongValue — msg.value=2e18 → revert "invalid report fee"

&#x20; 4. testRevertDuplicatePurchase — 重复购买 → revert "report already purchased"



&#x20; ## 技术要求



&#x20; - 使用 forge-std/Test.sol

&#x20; - 使用 deal() 给测试地址注入 native USDC

&#x20; - 使用 vm.prank() 模拟不同调用者

&#x20; - 使用 vm.warp() 推进时间测试 expiry

&#x20; - 使用 vm.expectRevert() 验证 revert 消息

&#x20; - 所有测试继承 Test 合约

&#x20; - 不要修改任何 .sol 源文件



&#x20; ## 验证



&#x20; 完成后运行:

&#x20; ```bash

&#x20; cd contracts \&\& forge test -vvv



&#x20; 所有 25 个测试必须通过。如果 forge test 有编译错误，修复测试代码（不要修改源文件）。



&#x20; 约束



&#x20; - 不要修改 contracts/src/ 下的任何源文件

&#x20; - 不要创建或修改 contracts/script/ 下的任何文件

&#x20; - 不要修改前端或后端代码

&#x20; - 不要添加测试文件以外的任何文件



&#x20; ### 6. 验收 Checklist



&#x20; | # | 检查项 | 验证方式 |

&#x20; |---|---|---|

&#x20; | 1 | 4 个测试文件存在于 contracts/test/ | `ls contracts/test/\*.t.sol` |

&#x20; | 2 | forge test -vvv 全部通过 | `cd contracts \&\& forge test -vvv` |

&#x20; | 3 | 测试数量 ≥ 25 | forge test 输出显示 test count |

&#x20; | 4 | createBond msg.value=0 revert | 测试存在且通过 |

&#x20; | 5 | auto-warn 逻辑测试 | risk > threshold → Warned, risk <= threshold → Active |

&#x20; | 6 | 非 oracle 直接调用 submitRiskUpdate revert | 测试存在且通过 |

&#x20; | 7 | refundBond 状态守卫 | Active/Warned 可退, Slashed revert |

&#x20; | 8 | settleBond expiry 检查 | 未到期 revert, 到期后成功 |

&#x20; | 9 | purchaseReport 金额校验 | 0 revert, 2e18 revert, 正确金额通过 |

&#x20; | 10 | purchaseReport 重复购买 revert | 测试存在且通过 |

&#x20; | 11 | oracle 授权/取消授权 | addOracle/removeOracle 测试 |

&#x20; | 12 | 未修改源文件 | `git diff contracts/src/` 无变更 |

&#x20; | 13 | 未修改前端/后端 | `git diff apps/ agents/` 无变更 |



&#x20; ---



&#x20; Codex 执行完成后回来，我会按这个 checklist 逐项验收。

