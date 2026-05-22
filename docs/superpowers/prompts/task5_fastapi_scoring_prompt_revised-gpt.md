# Task 5: FastAPI Backend + Mock Data + Risk Scoring — 修正版完整执行上下文

## 1. 目标

搭建 FastAPI 应用，包含 5 个 mock leader 数据（每个 30 天 snapshot）、deterministic rule-based risk scoring 引擎，以及 4 个 API endpoint。

本任务不调用 LLM、不接真实 Hyperliquid / Nansen、不提交链上交易、不修改前端、不修改合约。

Task 5 产出的后端数据结构需要能被后续任务复用：

- Task 6：LLM rationale / deterministic fallback；
- Task 7：x402 + chain submission；
- 前端 leader dashboard / risk report 页面。

---

## 2. 当前状态

项目根目录是当前工作目录。

后端目录：

```text
agents/risk-worker/
```

当前已有：

```text
agents/risk-worker/main.py
agents/risk-worker/requirements.txt
agents/risk-worker/.env.example
agents/risk-worker/.venv/
```

`main.py` 当前是 hello world / health check，需要替换为完整 API，但必须保留 CORS 配置和 `/health` endpoint。

---

## 3. 需要创建 / 修改的文件

| 操作 | 文件 |
|---|---|
| 创建 | `agents/risk-worker/config.py` |
| 创建 | `agents/risk-worker/schemas.py` |
| 创建 | `agents/risk-worker/mock_data.py` |
| 创建 | `agents/risk-worker/scoring.py` |
| 修改 | `agents/risk-worker/main.py` |
| 不修改 | `agents/risk-worker/requirements.txt` |
| 不修改 | `contracts/*` |
| 不修改 | `apps/*` |

只允许修改 `agents/risk-worker/` 下的上述文件。

严禁修改：

```text
contracts/
apps/
agents/risk-worker/requirements.txt
```

---

## 4. FastAPI Endpoints

需要实现以下 endpoint：

| Method | Path | 说明 |
|---|---|---|
| GET | `/health` | 健康检查，保留现有能力 |
| GET | `/api/leaders` | 返回 5 个 leader 列表，每个包含 id、name、venue、latest metrics |
| GET | `/api/leaders/{leader_id}` | 返回单个 leader 详情和 30 天 metrics history |
| GET | `/api/risk/{leader_id}` | 免费摘要：riskScoreBps、action、confidenceBps、summaryReason |
| POST | `/api/oracle/run-risk-check` | Body `{leaderId, bondId}`，返回完整 RiskReport；Task 5 不提交链上 |

未知 `leader_id` 时，以下接口必须返回 HTTP 404：

```text
GET /api/leaders/{leader_id}
GET /api/risk/{leader_id}
POST /api/oracle/run-risk-check
```

不要返回 `None`、空对象或 200。

---

## 5. Mock Leader / Metrics 数据结构

### 5.1 LeaderMetrics

Pydantic model，所有字段为 `float`：

```python
class LeaderMetrics(BaseModel):
    pnl7d: float
    pnl30d: float
    maxDrawdown7d: float
    maxDrawdown30d: float
    winRate7d: float
    winRate30d: float
    avgLeverage: float
    positionConcentration: float
    tradeFrequencyChange: float
```

字段含义：

- `pnl7d`：7 天盈亏比例；
- `pnl30d`：30 天盈亏比例；
- `maxDrawdown7d`：7 天最大回撤；
- `maxDrawdown30d`：30 天最大回撤；
- `winRate7d`：7 天胜率，范围 0-1；
- `winRate30d`：30 天胜率，范围 0-1；
- `avgLeverage`：平均杠杆倍数；
- `positionConcentration`：持仓集中度，范围 0-1；
- `tradeFrequencyChange`：交易频率变化倍数，1.0 表示正常。

### 5.2 5 个 Leader

需要提供 5 个 leader，每个 leader 有 30 天 daily snapshot。

| ID | Name | Profile | Risk Behavior |
|---|---|---|---|
| `hl_leader_01` | `Alpha Whale` | Healthy, consistent | Low risk，目标最新 riskScoreBps 1000-2500 |
| `hl_leader_02` | `Steady Eddie` | Healthy, conservative | Low risk，目标最新 riskScoreBps 1000-2500 |
| `hl_leader_03` | `Reckless Raj` | Degrading, aggressive | Rising risk，目标最新 riskScoreBps 3000-8000 |
| `hl_leader_04` | `Danger Dan` | Degrading, reckless | High risk，目标最新 riskScoreBps 6000-9500 |
| `hl_leader_05` | `Volatile Vera` | Volatile but profitable | Fluctuating risk，目标最新 riskScoreBps 2000-6000 |

### 5.3 时间序列要求

每个 leader 必须有 30 天 snapshot，每个 snapshot 是独立的 `LeaderMetrics` 对象。

`hl_leader_03` 必须体现明显退化：

```text
Day 1-10:
- drawdown ~0.10
- winRate ~0.55
- leverage ~4

Day 11-20:
- drawdown ~0.20
- winRate ~0.45
- leverage ~6

Day 21-30:
- drawdown ~0.35
- winRate ~0.35
- leverage ~9
```

`hl_leader_01` 和 `hl_leader_02` 应保持相对稳定。

`hl_leader_04` 应长期处于高风险。

`hl_leader_05` 应波动明显，但不一定持续恶化。

### 5.4 mock_data.py helper functions

必须实现：

```python
def get_all_leaders() -> list[Leader]:
    ...

def get_leader(leader_id: str) -> Leader | None:
    ...

def get_latest_metrics(leader_id: str) -> LeaderMetrics | None:
    ...

def get_metrics_history(leader_id: str) -> list[tuple[str, LeaderMetrics]]:
    ...
```

建议每条 history 使用 ISO date string。

不要使用随机数。Mock data 必须 deterministic。

---

## 6. Deterministic Risk Scoring 规则

### 6.1 核心函数

在 `agents/risk-worker/scoring.py` 中实现：

```python
def calculate_risk_score(metrics: LeaderMetrics) -> int:
    ...
```

输出范围：0-10000 basis points。

要求：

```text
相同输入必须产生完全相同输出。
不能使用 random。
不能调用外部 API。
不能调用 LLM。
不能依赖当前时间。
```

### 6.2 加权公式

```text
riskScoreBps =
  0.25 * drawdown_acceleration_score
  + 0.20 * win_rate_decay_score
  + 0.20 * leverage_regime_shift_score
  + 0.15 * position_concentration_score
  + 0.10 * trade_frequency_anomaly_score
  + 0.10 * volatility_adjusted_pnl_decay_score
```

所有子分数归一化到 0-10000。

最终：

```python
return max(0, min(10000, int(raw_score)))
```

### 6.3 子分数建议

#### 1. drawdown_acceleration_score，25%

基于：

```text
maxDrawdown7d vs maxDrawdown30d
```

目标：

- `maxDrawdown7d` 远大于 `maxDrawdown30d` 时，高分；
- 0.10 以下低分；
- 0.30 以上高分。

#### 2. win_rate_decay_score，20%

基于：

```text
winRate30d - winRate7d
```

目标：

- 7d win rate 远低于 30d baseline 时，高分；
- 差值 < 0.05 低分；
- 差值 > 0.15 高分。

#### 3. leverage_regime_shift_score，20%

基于：

```text
avgLeverage
```

目标：

- < 3x：低分；
- 3-8x：中分；
- > 8x：高分。

#### 4. position_concentration_score，15%

基于：

```text
positionConcentration
```

目标：

- < 0.3：低分；
- 0.3-0.6：中分；
- > 0.6：高分。

#### 5. trade_frequency_anomaly_score，10%

基于：

```text
abs(tradeFrequencyChange - 1.0)
```

目标：

- 1.0 接近 0 分；
- > 2.0 或 < 0.5 高分。

#### 6. volatility_adjusted_pnl_decay_score，10%

基于：

```text
pnl7d vs pnl30d
```

目标：

- pnl7d 明显低于 pnl30d，高分；
- pnl7d 正常或高于 pnl30d，低分；
- 可结合 drawdown 进行适度加权。

### 6.4 Reason 生成

实现：

```python
def generate_reasons(metrics: LeaderMetrics, risk_score_bps: int) -> list[str]:
    ...
```

要求：

- 不调用 LLM；
- 从各子因子阈值生成 readable reasons；
- 取 top 3；
- 如果没有明显风险，返回至少一条稳定说明，例如：
  `No significant risk detected from recent metrics`。

示例 reasons：

```text
7d win rate dropped significantly below 30d baseline
Leverage regime shifted upward, indicating increased risk
Drawdown acceleration exceeded safe threshold
Position concentration is elevated
Trade frequency deviated from baseline behavior
Recent PnL deteriorated relative to 30d baseline
```

---

## 7. Risk Report JSON Schema

### 7.1 Pydantic models

在 `schemas.py` 中定义 Pydantic v2 models。

必须包含：

```python
from pydantic import BaseModel

class LeaderMetrics(BaseModel):
    pnl7d: float
    pnl30d: float
    maxDrawdown7d: float
    maxDrawdown30d: float
    winRate7d: float
    winRate30d: float
    avgLeverage: float
    positionConcentration: float
    tradeFrequencyChange: float

class Leader(BaseModel):
    id: str
    name: str
    venue: str
    metrics: LeaderMetrics | None = None

class RiskSummary(BaseModel):
    leaderId: str
    riskScoreBps: int
    action: str
    confidenceBps: int
    summaryReason: str

class RiskReport(BaseModel):
    leaderId: str
    bondId: int
    riskScoreBps: int
    degradationDetected: bool
    action: str
    recommendedAllocationBps: int
    confidenceBps: int
    reasons: list[str]
    bondAction: str
    reportHash: str

class RiskCheckRequest(BaseModel):
    leaderId: str
    bondId: int
```

注意：`RiskReport` 必须包含 `bondId`。这是为了 Task 7 链上提交时继续使用：

```text
bondId + riskScoreBps + reportHash
```

### 7.2 GET /api/risk/{leader_id} Response

```json
{
  "leaderId": "hl_leader_03",
  "riskScoreBps": 7200,
  "action": "REDUCE",
  "confidenceBps": 7500,
  "summaryReason": "7d win rate dropped significantly below 30d baseline"
}
```

### 7.3 POST /api/oracle/run-risk-check Response

```json
{
  "leaderId": "hl_leader_03",
  "bondId": 1,
  "riskScoreBps": 7200,
  "degradationDetected": true,
  "action": "REDUCE",
  "recommendedAllocationBps": 2800,
  "confidenceBps": 7500,
  "reasons": [
    "7d win rate dropped significantly below 30d baseline",
    "Leverage regime shifted upward, indicating increased risk",
    "Drawdown acceleration exceeded safe threshold"
  ],
  "bondAction": "NONE",
  "reportHash": "0x..."
}
```

### 7.4 Task 5 阶段 deterministic report 规则

Task 5 不调用 LLM，直接从 scoring 规则生成：

```text
action:
- riskScoreBps < 3000 => FOLLOW
- 3000 <= riskScoreBps <= 7000 => REDUCE
- riskScoreBps > 7000 => EXIT

bondAction:
- 固定 NONE
- Task 7 才做链上提交 / WARN

confidenceBps:
- 固定 7500

recommendedAllocationBps:
- max(0, 10000 - riskScoreBps)

degradationDetected:
- riskScoreBps > 5000

reasons:
- 根据 scoring 因子超过阈值生成
- 取 top 3
```

### 7.5 reportHash 要求

`reportHash` 必须是 canonical JSON 的 keccak256。

要求：

```text
格式：0x + 64 个 hex 字符
总长度：66
正则：^0x[a-fA-F0-9]{64}$
```

生成方式：

1. 构建不含 `reportHash` 字段的 report dict；
2. 使用 `json.dumps(payload, sort_keys=True, separators=(",", ":"))` 得到 canonical JSON；
3. 使用 `Crypto.Hash.keccak` 做 keccak256；
4. 返回 `"0x" + digest.hex()`。

相同输入必须产生相同 `reportHash`。

---

## 8. config.py 要求

创建 `agents/risk-worker/config.py`。

必须使用 Pydantic v2 推荐写法：

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    LLM_PROVIDER: str | None = None
    LLM_API_KEY: str | None = None
    ARC_RPC_URL: str = "https://rpc.testnet.arc.network"
    ORACLE_PRIVATE_KEY: str | None = None
    BOND_VAULT_ADDRESS: str | None = None
    RISK_ORACLE_ADAPTER_ADDRESS: str | None = None
    REPORT_PAYMENT_ADDRESS: str | None = None
    LEADER_REGISTRY_ADDRESS: str | None = None

settings = Settings()
```

Task 5 不使用 LLM，不提交链上交易，但保留这些配置字段供 Task 6 / Task 7 使用。

---

## 9. main.py 要求

修改 `agents/risk-worker/main.py`。

保留：

```text
FastAPI app
CORS 配置
/health endpoint
```

建议 CORS 至少允许：

```python
allow_origins=["http://localhost:3000"]
```

实现 endpoints：

```python
@app.get("/health")
async def health():
    ...

@app.get("/api/leaders")
async def list_leaders():
    ...

@app.get("/api/leaders/{leader_id}")
async def get_leader_detail(leader_id: str):
    ...

@app.get("/api/risk/{leader_id}")
async def get_risk_summary(leader_id: str):
    ...

@app.post("/api/oracle/run-risk-check")
async def run_risk_check(request: RiskCheckRequest):
    ...
```

错误处理：

```python
from fastapi import HTTPException

raise HTTPException(status_code=404, detail="leader not found")
```

不要返回 `None`。

---

## 10. Codex 执行 Prompt

将以下内容完整粘贴给 Codex 执行：

```text
/codex:rescue --background --effort high

请执行 Task 5: FastAPI Backend + Mock Data + Risk Scoring。

项目根目录是当前工作目录，后端代码在 agents/risk-worker/。

请先读取：
1. docs/superpowers/specs/2026-05-19-copyguard-bond-p0-design.md
2. docs/superpowers/plans/copyguard-bond-p0-execution-plan.md
3. agents/risk-worker/main.py
4. agents/risk-worker/requirements.txt

当前任务目标：
搭建 FastAPI 应用，包含 5 个 mock leader 数据（每个 30 天 snapshot）、deterministic rule-based risk scoring 引擎、以及 4 个 API endpoint。

只允许创建 / 修改：
- agents/risk-worker/config.py
- agents/risk-worker/schemas.py
- agents/risk-worker/mock_data.py
- agents/risk-worker/scoring.py
- agents/risk-worker/main.py

不要修改：
- agents/risk-worker/requirements.txt
- contracts/
- apps/

重要约束：
1. 不调用 LLM，Task 6 才做。
2. 不接真实 Hyperliquid / Nansen，Task 5 只用 mock data。
3. 不提交链上交易，Task 7 才做。
4. 不修改前端。
5. 不修改合约。
6. 所有 scoring 必须 deterministic，相同输入必须得到相同 riskScoreBps 和 reportHash。
7. 所有 leader_id 不存在的 endpoint 必须返回 HTTP 404。
8. RiskReport 必须包含 bondId 字段。
9. reportHash 必须满足 ^0x[a-fA-F0-9]{64}$，总长度 66。

请创建 config.py：
- 使用 pydantic_settings BaseSettings + SettingsConfigDict
- 包含字段：LLM_PROVIDER, LLM_API_KEY, ARC_RPC_URL, ORACLE_PRIVATE_KEY, BOND_VAULT_ADDRESS, RISK_ORACLE_ADAPTER_ADDRESS, REPORT_PAYMENT_ADDRESS, LEADER_REGISTRY_ADDRESS

请创建 schemas.py：
- LeaderMetrics
- Leader
- RiskSummary
- RiskReport
- RiskCheckRequest
其中 RiskReport 必须包含：leaderId, bondId, riskScoreBps, degradationDetected, action, recommendedAllocationBps, confidenceBps, reasons, bondAction, reportHash。

请创建 mock_data.py：
- 5 个 leader：hl_leader_01 Alpha Whale, hl_leader_02 Steady Eddie, hl_leader_03 Reckless Raj, hl_leader_04 Danger Dan, hl_leader_05 Volatile Vera。
- 每个 leader 必须有 30 天 daily snapshot。
- 每个 snapshot 是 LeaderMetrics。
- hl_leader_03 必须随时间恶化：drawdown 上升、winRate 下降、leverage 上升。
- 不使用 random。
- 实现 get_all_leaders(), get_leader(leader_id), get_latest_metrics(leader_id), get_metrics_history(leader_id)。

请创建 scoring.py：
- calculate_risk_score(metrics: LeaderMetrics) -> int
- generate_reasons(metrics: LeaderMetrics, risk_score_bps: int) -> list[str]
- 使用加权公式：25% drawdown acceleration, 20% win rate decay, 20% leverage regime shift, 15% position concentration, 10% trade frequency anomaly, 10% volatility adjusted pnl decay。
- 输出 clamp 到 0-10000。
- reasons 取 top 3。

请修改 main.py：
- 保留 FastAPI app、CORS、/health。
- 添加 GET /api/leaders, GET /api/leaders/{leader_id}, GET /api/risk/{leader_id}, POST /api/oracle/run-risk-check。
- /api/risk 返回 RiskSummary。
- /api/oracle/run-risk-check 返回 RiskReport。
- action 规则：riskScoreBps < 3000 => FOLLOW；3000 <= riskScoreBps <= 7000 => REDUCE；riskScoreBps > 7000 => EXIT。
- Task 5 中 bondAction 固定为 "NONE"。
- confidenceBps 固定为 7500。
- degradationDetected = riskScoreBps > 5000。
- recommendedAllocationBps = max(0, 10000 - riskScoreBps)。
- reportHash = keccak256(canonical JSON without reportHash)。

实现完成后，请运行或提供以下验证方式：
1. uvicorn main:app --reload 能启动；
2. curl http://localhost:8000/api/leaders 返回 5 个 leader；
3. curl http://localhost:8000/api/leaders/hl_leader_03 返回详情；
4. curl http://localhost:8000/api/risk/hl_leader_03 返回 RiskSummary；
5. POST /api/oracle/run-risk-check 返回完整 RiskReport；
6. 同一 leader 连续请求返回相同 riskScoreBps；
7. 同一 leader + bondId 连续请求返回相同 reportHash；
8. risk score 区间：hl_leader_01 1000-2500, hl_leader_02 1000-2500, hl_leader_03 3000-8000, hl_leader_04 6000-9500, hl_leader_05 2000-6000；
9. git diff contracts/ 为空；
10. git diff apps/ 为空。

如果分数不在区间内，优先调整 mock metrics 或 scoring normalization，不要引入随机数。

最后总结：创建/修改了哪些文件；每个 endpoint；5 个 leader 的 riskScoreBps；reportHash 格式是否正确；是否修改了 contracts/ 或 apps/；是否存在未完成项。
```

---

## 11. 验证命令

### 11.1 启动后端

PowerShell：

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora\agents\risk-worker
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

### 11.2 curl 验证

另开一个 PowerShell：

```powershell
curl http://localhost:8000/health
curl http://localhost:8000/api/leaders
curl http://localhost:8000/api/leaders/hl_leader_03
curl http://localhost:8000/api/risk/hl_leader_03
curl -X POST http://localhost:8000/api/oracle/run-risk-check -H "Content-Type: application/json" -d "{\"leaderId\":\"hl_leader_03\",\"bondId\":1}"
```

### 11.3 Python 验证 deterministic 和分数区间

PowerShell：

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora\agents\risk-worker
.\.venv\Scripts\python.exe -c "from mock_data import get_all_leaders,get_latest_metrics; from scoring import calculate_risk_score; [print(l.id,l.name,calculate_risk_score(get_latest_metrics(l.id))) for l in get_all_leaders()]"
```

---

## 12. 验收 Checklist

| # | 检查项 | 验证方式 |
|---|---|---|
| 1 | `config.py` 存在，Settings 类包含所有字段 | 读文件 |
| 2 | `schemas.py` 存在，包含 LeaderMetrics, Leader, RiskSummary, RiskReport, RiskCheckRequest | 读文件 |
| 3 | RiskReport 包含 `bondId` | 读 `schemas.py` |
| 4 | `mock_data.py` 存在，5 个 leader，每个 30 天 snapshot | 读文件 / 调 helper |
| 5 | `scoring.py` 存在，包含 calculate_risk_score + generate_reasons | 读文件 |
| 6 | scoring deterministic | 同一 metrics 两次 score 相同 |
| 7 | `main.py` 保留 CORS + `/health` | 读文件 / curl |
| 8 | GET `/api/leaders` 返回 5 个 leader | curl |
| 9 | GET `/api/leaders/{leader_id}` 返回详情 | curl |
| 10 | GET `/api/risk/{leader_id}` 返回 RiskSummary | curl |
| 11 | POST `/api/oracle/run-risk-check` 返回完整 RiskReport | curl |
| 12 | 未知 leader_id 返回 HTTP 404 | curl 不存在的 id |
| 13 | reportHash 格式正确 | `0x` + 64 hex，总长度 66 |
| 14 | 同一 leader + bondId 连续请求 reportHash 相同 | curl 两次比较 |
| 15 | riskScoreBps 区间合理 | curl / Python |
| 16 | 未修改 `contracts/` | `git diff contracts/` |
| 17 | 未修改 `apps/` | `git diff apps/` |
| 18 | 未修改 `requirements.txt` | `git diff agents/risk-worker/requirements.txt` |

---

## 13. 预期提交命令

Task 5 验收通过后：

```powershell
cd D:\Work\Development\AI\ClaudeCode\Agora
git add agents/risk-worker/config.py agents/risk-worker/schemas.py agents/risk-worker/mock_data.py agents/risk-worker/scoring.py agents/risk-worker/main.py
git commit -m "feat: add FastAPI risk scoring backend"
```
