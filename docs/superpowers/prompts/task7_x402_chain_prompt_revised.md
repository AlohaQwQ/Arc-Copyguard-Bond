# Task 7: x402 Paid Report + Chain Submission — 完整执行上下文

## 1. 目标

完成两件事：
1. **链上风险提交**：POST /api/oracle/run-risk-check 在生成 risk report 后，调用 RiskOracleAdapter.submitRiskUpdate 将 risk update 提交到 Arc Testnet
2. **x402 付费报告**：GET /api/reports/{leader_id} 实现完整的 402 negotiation + Arc 链上 payment proof 验证流程

## 2. 需要创建/修改的文件

| 操作 | 文件 |
|---|---|
| 创建 | `agents/risk-worker/chain.py` |
| 创建 | `agents/risk-worker/x402.py` |
| 修改 | `agents/risk-worker/main.py` |
| 修改（仅限新增字段） | `agents/risk-worker/schemas.py`：只允许在 `RiskReport` 中新增 `txHash: str | None = None` |
| 不修改 | `agents/risk-worker/llm.py`、`scoring.py`、`mock_data.py`、`config.py` |
| 不修改 | `contracts/*`、`apps/*` |

## 3. 需要的环境变量

从 `agents/risk-worker/.env` 读取（**不要在对话中暴露私钥**）：

| 变量 | 用途 | 已有？ |
|---|---|---|
| `ARC_RPC_URL` | Arc Testnet RPC | ✅ config.py 已有 |
| `ORACLE_PRIVATE_KEY` | 后端 oracle 钱包私钥，用于签名链上 tx | ✅ config.py 已有 |
| `RISK_ORACLE_ADAPTER_ADDRESS` | RiskOracleAdapter 合约地址 | ✅ config.py 已有 |
| `REPORT_PAYMENT_ADDRESS` | ReportPayment 合约地址 | ✅ config.py 已有 |
| `BOND_VAULT_ADDRESS` | CopyGuardBondVault 合约地址 | ✅ config.py 已有 |

部署后需要用户在 `.env` 中填入实际值（来自 `contracts/deployments/arc-testnet.json`）：

```
RISK_ORACLE_ADAPTER_ADDRESS=0x63109ECE16d78A5cEc5499F7f154e107549f7965
REPORT_PAYMENT_ADDRESS=0x15832FA84424E257ACf3735e905E9a5d3B33ee82
BOND_VAULT_ADDRESS=0x822bBEF75F14744d11BaC553997Bd908dBE49B47
ORACLE_PRIVATE_KEY=<用户自己的 oracle 私钥，不在对话中提供>
```

## 4. 如何读取 RiskOracleAdapter 地址

从 `config.py` 的 `settings.RISK_ORACLE_ADAPTER_ADDRESS` 读取。

chain.py 初始化或 `submit_risk_update()` 内必须检查：
```python
if not settings.RISK_ORACLE_ADAPTER_ADDRESS or not settings.ORACLE_PRIVATE_KEY:
    # chain submission 不可用，但 API 仍可工作（返回 report 不含 txHash）
    raise ValueError("chain submission is not configured")

if w3.eth.chain_id != 5042002:
    raise ValueError("wrong chain")
```

链上提交失败不应导致 API 失败，由 `main.py` 捕获异常并返回 `txHash: null`。

## 5. 如何用 web3.py 调用 submitRiskUpdate

### 合约接口

RiskOracleAdapter.submitRiskUpdate 签名：
```solidity
function submitRiskUpdate(uint256 bondId, uint16 riskScoreBps, bytes32 reportHash) external
```

### ABI（最小化，只需这一个函数）

```python
RISK_ORACLE_ADAPTER_ABI = [
    {
        "inputs": [
            {"name": "bondId", "type": "uint256"},
            {"name": "riskScoreBps", "type": "uint16"},
            {"name": "reportHash", "type": "bytes32"},
        ],
        "name": "submitRiskUpdate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]
```

### ReportPayment ABI（用于 x402 验证）

```python
REPORT_PAYMENT_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "user", "type": "address"},
            {"indexed": True, "name": "leaderId", "type": "bytes32"},
            {"indexed": False, "name": "amount", "type": "uint256"},
            {"indexed": False, "name": "timestamp", "type": "uint256"},
        ],
        "name": "ReportPurchased",
        "type": "event",
    }
]
```

### web3.py 调用流程

```python
from web3 import Web3
from config import settings

w3 = Web3(Web3.HTTPProvider(settings.ARC_RPC_URL))
adapter = w3.eth.contract(
    address=Web3.to_checksum_address(settings.RISK_ORACLE_ADAPTER_ADDRESS),
    abi=RISK_ORACLE_ADAPTER_ABI,
)

def submit_risk_update(bond_id: int, risk_score_bps: int, report_hash: str) -> str:
    """提交 risk update 到 Arc，返回 tx hash"""
    if not report_hash.startswith("0x") or len(report_hash) != 66:
        raise ValueError("invalid report_hash")

    report_hash_bytes32 = bytes.fromhex(report_hash[2:])
    if len(report_hash_bytes32) != 32:
        raise ValueError("invalid report_hash bytes32 length")

    if w3.eth.chain_id != 5042002:
        raise ValueError("wrong chain")

    oracle_account = w3.eth.account.from_key(settings.ORACLE_PRIVATE_KEY)

    tx = adapter.functions.submitRiskUpdate(
        bond_id,
        risk_score_bps,
        report_hash_bytes32  # "0xabcd..." → bytes32
    ).build_transaction({
        "from": oracle_account.address,
        "nonce": w3.eth.get_transaction_count(oracle_account.address),
        "gas": 300_000,
        "gasPrice": w3.eth.gas_price,
        "chainId": 5042002,
    })

    signed = oracle_account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)

    if receipt["status"] != 1:
        raise Exception(f"Transaction reverted: {receipt['transactionHash'].hex()}")

    return receipt["transactionHash"].hex()
```

## 6. 如何把 reportHash 转换为 bytes32

当前 main.py `_hash_report()` 返回 `"0x" + hex_digest`（66 字符字符串）。

合约 `submitRiskUpdate` 的 `reportHash` 参数类型是 `bytes32`。

转换方式：
```python
# report_hash 是 "0xabcdef..." 格式的 66 字符字符串
report_hash_bytes32 = bytes.fromhex(report_hash[2:])  # 去掉 "0x" 前缀，转为 32 字节
```

在 chain.py 中调用时直接传 `bytes.fromhex(report_hash[2:])` 作为第三个参数。

## 7. x402 / reports endpoint 在 P0 中的最小实现范围

### P0 实现范围

GET /api/reports/{leader_id}：

**无付款头时** → 返回 402：
```json
{
  "status": 402,
  "message": "Payment required to unlock full risk report",
  "price": "1000000000000000000",
  "priceHuman": "1 USDC",
  "recipient": "<ReportPayment 合约地址>",
  "resource": "report:hl_leader_03",
  "chainId": 5042002,
  "contractAddress": "<ReportPayment 合约地址>",
  "instructions": "Call purchaseReport(leaderId) with msg.value = 1 USDC on Arc Testnet, then retry with X-Payment-Tx-Hash and X-Wallet-Address headers"
}
```

**带 X-Payment-Tx-Hash + X-Wallet-Address 头时** → 验证付款：
1. 通过 Arc RPC 查询 tx receipt（`eth_getTransactionReceipt`）
2. 验证 tx status == 1（成功）
3. 验证 `to` == ReportPayment 合约地址
4. 解析 logs 中 ReportPurchased 事件
5. 验证事件参数：user == X-Wallet-Address，leaderId 匹配，amount == 1e18
6. 验证 amount == 1000000000000000000（1 USDC）
7. 全部通过 → 返回完整 risk report
8. 任一失败 → 返回 402 + 错误详情

### x402 验证细节

ReportPurchased 事件签名：
```
keccak256("ReportPurchased(address,bytes32,uint256,uint256)")
```
= `0x...`（需要计算）

事件的 topics：
- topics[0] = event signature hash
- topics[1] = indexed user (address, left-padded to 32 bytes)
- topics[2] = indexed leaderId (bytes32)

事件的 data（非 indexed 参数）：
- amount (uint256)
- timestamp (uint256)

验证步骤：
```python
# 1. 计算 event signature
event_sig = Web3.keccak(text="ReportPurchased(address,bytes32,uint256,uint256)")

# 2. 遍历 receipt.logs，找 to==ReportPayment 且 topics[0]==event_sig 的 log
# 3. 解码 topics[1] 得到 user address
# 4. 解码 topics[2] 得到 leaderId (bytes32)
# 5. 解码 data 得到 amount + timestamp
# 6. 对比验证
```

### P0 不做的

- 不实现完整的 x402 facilitator / nanopayments
- 不做 payment server 端构造 tx
- 不做 receipt 缓存（每次请求都查链上）

## 8. Codex 执行 Prompt

> 将以下内容完整粘贴给 Codex 执行。

---

你正在为 CopyGuard Bond 项目添加链上提交和 x402 付费报告功能。后端代码在 `agents/risk-worker/`。

### 当前代码状态

**agents/risk-worker/config.py** 已有：
```python
ARC_RPC_URL: str = "https://rpc.testnet.arc.network"
ORACLE_PRIVATE_KEY: str | None = None
BOND_VAULT_ADDRESS: str | None = None
RISK_ORACLE_ADAPTER_ADDRESS: str | None = None
REPORT_PAYMENT_ADDRESS: str | None = None
```

**agents/risk-worker/main.py** 当前 POST /api/oracle/run-risk-check 返回 RiskReport（无链上提交）。
**agents/risk-worker/main.py** 当前 GET /api/reports/{leader_id} 返回简单 402（无验证逻辑）。

### 已部署合约地址（Arc Testnet chainId 5042002）

- CopyGuardBondVault: `0x822bBEF75F14744d11BaC553997Bd908dBE49B47`
- RiskOracleAdapter: `0x63109ECE16d78A5cEc5499F7f154e107549f7965`
- ReportPayment: `0x15832FA84424E257ACf3735e905E9a5d3B33ee82`

### 需要做的事

#### 1. 创建 agents/risk-worker/chain.py

实现链上 risk update 提交功能：

```python
def submit_risk_update(bond_id: int, risk_score_bps: int, report_hash: str) -> str:
```

使用 web3.py：
- 连接 Arc Testnet RPC（从 config.settings.ARC_RPC_URL）
- 加载 oracle 私钥（从 config.settings.ORACLE_PRIVATE_KEY）
- 调用 RiskOracleAdapter.submitRiskUpdate(bondId, riskScoreBps, reportHash)
- reportHash 从 "0x..." 字符串转为 bytes32：`bytes.fromhex(report_hash[2:])`
- 签名并发送交易
- 等待 receipt（timeout 30 秒）
- 验证 receipt.status == 1
- 返回 tx hash 字符串

处理配置缺失：
- 如果 RISK_ORACLE_ADAPTER_ADDRESS 或 ORACLE_PRIVATE_KEY 未设置
- submit_risk_update 应抛出明确的 ValueError
- 调用方（main.py）负责捕获异常并返回 txHash: null

RiskOracleAdapter ABI（最小化，只需 submitRiskUpdate）：
```python
RISK_ORACLE_ADAPTER_ABI = [
    {
        "inputs": [
            {"name": "bondId", "type": "uint256"},
            {"name": "riskScoreBps", "type": "uint16"},
            {"name": "reportHash", "type": "bytes32"},
        ],
        "name": "submitRiskUpdate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]
```

#### 2. 创建 agents/risk-worker/x402.py

实现 x402 付款验证功能：

```python
def build_402_response(leader_id: str) -> dict:
    """构建 402 Payment Required 响应体"""

def verify_payment(tx_hash: str, wallet_address: str, leader_id: str) -> tuple[bool, str]:
    """验证链上付款证明。返回 (success, message)"""
```

**build_402_response** 返回：
```python
{
    "status": 402,
    "message": "Payment required to unlock full risk report",
    "price": "1000000000000000000",
    "priceHuman": "1 USDC",
    "recipient": settings.REPORT_PAYMENT_ADDRESS,
    "resource": f"report:{leader_id}",
    "chainId": 5042002,
    "contractAddress": settings.REPORT_PAYMENT_ADDRESS,
    "instructions": "Call purchaseReport(leaderId) with msg.value = 1 USDC on Arc Testnet, then retry with X-Payment-Tx-Hash and X-Wallet-Address headers"
}
```

**verify_payment** 验证步骤：
1. 用 web3.py 调用 `eth_getTransactionReceipt(tx_hash)`
2. 检查 receipt 存在且 status == 1
3. 检查 receipt["to"] == settings.REPORT_PAYMENT_ADDRESS（转 checksum address 后比较）
4. 计算 ReportPurchased event signature：`Web3.keccak(text="ReportPurchased(address,bytes32,uint256,uint256)")`
5. 遍历 receipt.logs，找到 topics[0] == event signature 的 log
6. 解码 topics[1] 得到 user address（去掉前 12 字节零填充）
7. 比较 user address（转 checksum 后）== wallet_address（转 checksum 后）
8. 解码 topics[2] 得到 leaderId bytes32，转为字符串并与预期 leader_id 比较
   - 注意：合约中 leaderId 是 `bytes32("hl_leader_03")` 格式，即右填充零的 ASCII 字符串
   - 比较时需要处理 bytes32 → string 的转换（strip 右侧零字节）
9. 解码 data 得到 amount，必须等于 `1000000000000000000`
10. 验证失败 → 返回 (False, 具体错误信息)
11. 验证成功 → 返回 (True, "verified")

ReportPayment 事件 ABI：
```python
REPORT_PAYMENT_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "user", "type": "address"},
            {"indexed": True, "name": "leaderId", "type": "bytes32"},
            {"indexed": False, "name": "amount", "type": "uint256"},
            {"indexed": False, "name": "timestamp", "type": "uint256"},
        ],
        "name": "ReportPurchased",
        "type": "event",
    }
]
```

#### 3. 修改 agents/risk-worker/main.py

**修改 POST /api/oracle/run-risk-check**：
在生成 report 后，尝试提交链上：

```python
@app.post("/api/oracle/run-risk-check", response_model=RiskReport)
async def run_risk_check(request: RiskCheckRequest):
    metrics = get_latest_metrics(request.leaderId)
    if metrics is None:
        raise HTTPException(status_code=404, detail="leader not found")

    risk_score_bps = calculate_risk_score(metrics)
    reasons = generate_rationale(metrics, risk_score_bps)
    payload = {
        "leaderId": request.leaderId,
        "bondId": request.bondId,
        "riskScoreBps": risk_score_bps,
        "degradationDetected": risk_score_bps > 5000,
        "action": _action_for_score(risk_score_bps),
        "recommendedAllocationBps": max(0, 10000 - risk_score_bps),
        "confidenceBps": 7500,
        "reasons": reasons,
        "bondAction": "NONE",
    }
    report_hash = _hash_report(payload)

    # 链上提交（可选，配置缺失时跳过）
    tx_hash = None
    try:
        from chain import submit_risk_update
        tx_hash = submit_risk_update(request.bondId, risk_score_bps, report_hash)
    except Exception as exc:
        print(f"chain submission skipped: {type(exc).__name__}")  # 不打印私钥或敏感 header
        tx_hash = None  # 链上提交失败不影响 API 响应

    return RiskReport(**payload, reportHash=report_hash, txHash=tx_hash)
```

**注意**：RiskReport schema 需要新增 `txHash: str | None = None` 字段（在 schemas.py 中）。

**修改 GET /api/reports/{leader_id}**：
从简单 402 改为完整 x402 验证流程：

```python
@app.get("/api/reports/{leader_id}")
async def get_report(leader_id: str):
    metrics = get_latest_metrics(leader_id)
    if metrics is None:
        raise HTTPException(status_code=404, detail="leader not found")

    # 检查付款头
    tx_hash = request.headers.get("X-Payment-Tx-Hash")
    wallet_address = request.headers.get("X-Wallet-Address")

    if not tx_hash or not wallet_address:
        # 返回 402
        from x402 import build_402_response
        return JSONResponse(status_code=402, content=build_402_response(leader_id))

    # 验证付款
    from x402 import verify_payment
    verified, message = verify_payment(tx_hash, wallet_address, leader_id)

    if not verified:
        return JSONResponse(status_code=402, content={
            **build_402_response(leader_id),
            "verificationError": message,
        })

    # 验证通过 → 返回完整报告
    risk_score_bps = calculate_risk_score(metrics)
    reasons = generate_rationale(metrics, risk_score_bps)
    payload = {
        "leaderId": leader_id,
        "riskScoreBps": risk_score_bps,
        "degradationDetected": risk_score_bps > 5000,
        "action": _action_for_score(risk_score_bps),
        "recommendedAllocationBps": max(0, 10000 - risk_score_bps),
        "confidenceBps": 7500,
        "reasons": reasons,
    }
    # 注意：这里不需要 bondId 和 bondAction，这是 report 不是 risk-check
    return JSONResponse(
        status_code=200,
        content={**payload, "reportHash": _hash_report(payload)},
        headers={"PAYMENT-RESPONSE": "verified"},
    )
```

**注意**：需要在 main.py 顶部添加 `from starlette.requests import Request`，endpoint 函数签名改为 `async def get_report(leader_id: str, request: Request)`。

#### 4. 修改 agents/risk-worker/schemas.py

在 RiskReport 中新增可选字段：
```python
class RiskReport(BaseModel):
    # ... 现有字段 ...
    txHash: str | None = None  # 新增：链上提交的 tx hash
```

### 约束

- 不要求用户提供私钥到对话中，ORACLE_PRIVATE_KEY 只从本地 .env 读取
- 不重新部署合约
- 不修改 contracts/src/ 下的任何文件
- 不修改 apps/ 下的任何文件
- 不修改 llm.py、scoring.py、mock_data.py、config.py、requirements.txt
- 允许修改 schemas.py，但只允许在 RiskReport 中新增 `txHash: str | None = None`，不允许修改其他 schema 字段、字段名或字段类型
- LLM 不能决定 riskScoreBps — 链上提交的 riskScoreBps 完全由 calculate_risk_score 决定
- LLM 只允许影响 reasons，不允许影响 action、bondAction、recommendedAllocationBps、confidenceBps
- 链上提交失败不应导致 API 请求失败（txHash 为 None 即可）
- 链上提交失败时不能完全静默，main.py 应打印安全 warning，例如 `chain submission skipped: ValueError`，但不得打印 ORACLE_PRIVATE_KEY、Authorization header、完整 .env 内容
- x402 验证必须同时检查：tx status、contract address、event user、leaderId、amount
- x402 amount 必须等于 `1000000000000000000`，即 P0 报告价格 1 USDC
- chain.py 和 x402.py 都必须显式验证 chainId == 5042002
- reportHash 必须严格校验为 `0x` + 64 hex，总长度 66；转为 bytes32 后长度必须是 32 bytes
- verify_payment 必须安全失败：tx_hash 格式错误、receipt 不存在、RPC 报错、log decode 失败，都返回 `(False, "...")`，不允许抛异常导致 FastAPI 500
- GET /api/reports/{leader_id} 只验证 payment proof，不调用 submit_risk_update，不提交链上 risk update
- 保持所有现有 endpoint 和 CORS 配置


### 额外安全与稳定性检查

完成实现后请特别确认：

1. 未设置 `ORACLE_PRIVATE_KEY` 时，`from main import app` 必须通过，uvicorn 必须能启动。
2. 未设置链上配置时，`POST /api/oracle/run-risk-check` 仍返回完整 `RiskReport`，其中 `txHash` 为 `null`。
3. 配置链上提交时，`txHash` 成功返回必须是 `0x...` 交易哈希。
4. 无付款头访问 `GET /api/reports/{leader_id}` 必须返回 402，并包含 `price`、`recipient`、`chainId`、`contractAddress`、`instructions`。
5. 假 tx hash 或错误 wallet 地址访问 `GET /api/reports/{leader_id}` 必须返回 402 + `verificationError`，不能返回 500。
6. 已付费验证通过后返回完整报告，并在响应 header 中包含 `PAYMENT-RESPONSE: verified`。

### 验证

完成后确保 uvicorn 能正常启动（不设置 ORACLE_PRIVATE_KEY 时也能启动，只是链上提交被跳过）：

```bash
cd agents/risk-worker
.venv\Scripts\activate
uvicorn main:app --reload
```

测试：
```bash
# 1. 未付费请求报告
curl -v http://localhost:8000/api/reports/hl_leader_03
# 应返回 402，body 包含 price, recipient, chainId, instructions

# 2. 带假 tx hash 的请求
curl http://localhost:8000/api/reports/hl_leader_03 -H "X-Payment-Tx-Hash: 0x0000000000000000000000000000000000000000000000000000000000000000" -H "X-Wallet-Address: 0x1234567890123456789012345678901234567890"
# 应返回 402 + verificationError

# 3. Risk check（如果 .env 配置了 ORACLE_PRIVATE_KEY）
curl -X POST http://localhost:8000/api/oracle/run-risk-check -H "Content-Type: application/json" -d "{\"leaderId\":\"hl_leader_03\",\"bondId\":1}"
# 应返回 RiskReport，txHash 字段有值（链上提交成功）或为 null（配置缺失）
```

---

## 9. 验收 Checklist

| # | 检查项 | 验证方式 |
|---|---|---|
| 1 | `agents/risk-worker/chain.py` 存在 | `ls agents/risk-worker/chain.py` |
| 2 | `agents/risk-worker/x402.py` 存在 | `ls agents/risk-worker/x402.py` |
| 3 | chain.py 包含 `submit_risk_update(bond_id, risk_score_bps, report_hash)` | 读文件 |
| 4 | chain.py 使用 web3.py + config settings | 读文件，检查 Web3 导入和 settings 引用 |
| 5 | reportHash "0x..." → bytes32 转换正确 | 读文件，检查 `bytes.fromhex(report_hash[2:])` |
| 6 | x402.py 包含 `build_402_response` 和 `verify_payment` | 读文件 |
| 7 | build_402_response 包含所有字段（price, recipient, chainId, contractAddress, instructions） | 读文件 |
| 8 | verify_payment 检查：tx status, contract address, event user, leaderId, amount | 读文件 |
| 9 | main.py run-risk-check 调用 chain.submit_risk_update | 读文件 |
| 10 | main.py run-risk-check 链上失败不影响 API 响应 | 读文件，try/except 包裹 |
| 11 | main.py GET /api/reports/{id} 实现完整 x402 流程 | 读文件 |
| 12 | 未付费 → 402 with all fields | `curl -v localhost:8000/api/reports/hl_leader_03` |
| 13 | schemas.py 仅在 RiskReport 新增 txHash 字段，其他 schema 不变 | 读 schemas.py + git diff |
| 14 | 未修改 llm.py | `git diff agents/risk-worker/llm.py` 无变更 |
| 15 | 未修改 scoring.py | `git diff agents/risk-worker/scoring.py` 无变更 |
| 16 | 未修改 mock_data.py | `git diff agents/risk-worker/mock_data.py` 无变更 |
| 17 | 未修改 config.py | `git diff agents/risk-worker/config.py` 无变更 |
| 17.1 | chain.py/x402.py 显式验证 chainId == 5042002 | 读文件 |
| 17.2 | verify_payment 验证 amount == 1000000000000000000 | 读文件 |
| 18 | 未修改 requirements.txt | `git diff agents/risk-worker/requirements.txt` 无变更 |
| 19 | 未修改 contracts/ | `git diff contracts/` 无变更 |
| 20 | 未修改 apps/ | `git diff apps/` 无变更 |
| 21 | uvicorn 启动成功（无 ORACLE_PRIVATE_KEY 也能启动） | `uvicorn main:app --reload` |
| 22 | 保留所有现有 endpoint | 读 main.py，确认 /health, /api/leaders, /api/leaders/{id}, /api/risk/{id} 都在 |
