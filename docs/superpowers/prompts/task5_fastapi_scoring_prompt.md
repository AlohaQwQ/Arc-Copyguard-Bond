# Task 5: FastAPI Backend + Mock Data + Risk Scoring — 完整执行上下文

## 1. 目标

搭建 FastAPI 应用，包含 5 个 mock leader 数据（30 天 snapshot）、deterministic rule-based risk scoring 引擎、以及 4 个 API endpoint。不调用 LLM、不接真实数据源、不提交链上交易。

## 2. 需要创建/修改的文件

| 操作 | 文件 |
|---|---|
| 创建 | `agents/risk-worker/config.py` |
| 创建 | `agents/risk-worker/schemas.py` |
| 创建 | `agents/risk-worker/mock_data.py` |
| 创建 | `agents/risk-worker/scoring.py` |
| 修改 | `agents/risk-worker/main.py`（当前是 hello world，需替换为完整 API） |
| 不修改 | `agents/risk-worker/requirements.txt`（已包含所有依赖） |
| 不修改 | `contracts/*`、`apps/*` |

## 3. FastAPI Endpoints

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/leaders` | 返回 5 个 leader 列表（id, name, venue, latest metrics） |
| GET | `/api/leaders/{leader_id}` | 返回单个 leader 详情 + metrics |
| GET | `/api/risk/{leader_id}` | 免费摘要：riskScoreBps, action, confidenceBps, summaryReason |
| POST | `/api/oracle/run-risk-check` | Body: `{leaderId, bondId}` → 返回完整 RiskReport（暂不提交链上） |
| GET | `/health` | 健康检查（保留现有） |

## 4. Mock Leader / Metrics 数据结构

### LeaderMetrics（Pydantic model）

所有字段为 float：
- `pnl7d`, `pnl30d` — 7天/30天盈亏比例
- `maxDrawdown7d`, `maxDrawdown30d` — 7天/30天最大回撤
- `winRate7d`, `winRate30d` — 7天/30天胜率（0-1）
- `avgLeverage` — 平均杠杆倍数
- `positionConcentration` — 持仓集中度（0-1）
- `tradeFrequencyChange` — 交易频率变化倍数（1.0 = 正常）

### Leader 数据

5 个 leader，每个有 30 天 daily snapshot：

| ID | Name | Profile | Risk Behavior |
|---|---|---|---|
| `hl_leader_01` | "Alpha Whale" | Healthy, consistent | Low risk ~1500-2500 bps, stable metrics |
| `hl_leader_02` | "Steady Eddie" | Healthy, conservative | Low risk ~1000-2000 bps, low leverage |
| `hl_leader_03` | "Reckless Raj" | Degrading, aggressive | Rising risk ~3000→8000 bps over 30 days |
| `hl_leader_04` | "Danger Dan" | Degrading, reckless | High risk ~6000-9500 bps, increasing leverage |
| `hl_leader_05` | "Volatile Vera" | Volatile but profitable | Fluctuating risk ~2000-6000 bps |

Helper functions:
- `get_all_leaders() -> list[Leader]`
- `get_leader(leader_id: str) -> Leader | None`
- `get_latest_metrics(leader_id: str) -> LeaderMetrics | None`

**数据设计要点**：
- hl_leader_03 的 metrics 应随时间恶化（30 天内 drawdown 上升、winRate 下降、leverage 上升）
- hl_leader_01/02 的 metrics 应保持稳定
- 每天的 snapshot 是独立的 LeaderMetrics 对象

## 5. Deterministic Risk Scoring 规则

函数签名：`calculate_risk_score(metrics: LeaderMetrics) -> int`

输出范围：0-10000 basis points。**相同输入必须产生相同输出**（无随机、无外部调用）。

### 加权公式

```
riskScoreBps =
  0.25 * drawdown_acceleration_score +
  0.20 * win_rate_decay_score +
  0.20 * leverage_regime_shift_score +
  0.15 * position_concentration_score +
  0.10 * trade_frequency_anomaly_score +
  0.10 * volatility_adjusted_pnl_decay_score
```

### 每个子分数的归一化建议（0-10000）

1. **drawdown_acceleration**（25%）：
   - 基于 `maxDrawdown7d` vs `maxDrawdown30d` 的加速度
   - drawdown7d 远大于 drawdown30d → 高分
   - 阈值参考：0.1 以下低分，0.3 以上高分

2. **win_rate_decay**（20%）：
   - 基于 `winRate30d - winRate7d` 的差值
   - 7d winRate 远低于 30d → 高分（退化信号）
   - 差值 < 0.05 → 低分，> 0.15 → 高分

3. **leverage_regime_shift**（20%）：
   - 基于 `avgLeverage` 绝对值
   - < 3x → 低分，3-8 → 中分，> 8 → 高分

4. **position_concentration**（15%）：
   - 基于 `positionConcentration` 值
   - < 0.3 → 低分，0.3-0.6 → 中分，> 0.6 → 高分

5. **trade_frequency_anomaly**（10%）：
   - 基于 `tradeFrequencyChange` 偏离 1.0 的程度
   - 1.0 → 0 分，> 2.0 或 < 0.5 → 高分

6. **volatility_adjusted_pnl_decay**（10%）：
   - 基于 `pnl7d` 与 `pnl30d` 的比值（考虑 drawdown）
   - pnl7d 远低于 pnl30d → 高分

### 最终 clamp

```python
return max(0, min(10000, int(raw_score)))
```

## 6. Risk Report JSON Schema

### POST /api/oracle/run-risk-check Response

```json
{
  "leaderId": "hl_leader_03",
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
  "bondAction": "WARN",
  "reportHash": "0x..."
}
```

### GET /api/risk/{leader_id} Response（免费摘要）

```json
{
  "leaderId": "hl_leader_03",
  "riskScoreBps": 7200,
  "action": "REDUCE",
  "confidenceBps": 7500,
  "summaryReason": "7d win rate dropped significantly below 30d baseline"
}
```

### Task 5 阶段的确定性 reasons 生成

不调用 LLM，直接从 scoring 规则生成：
- action：<3000 FOLLOW, 3000-7000 REDUCE, >7000 EXIT
- bondAction：NONE（Task 5 不做链上，固定 NONE）
- confidenceBps：7500（固定中等置信度）
- recommendedAllocationBps：max(0, 10000 - riskScoreBps)
- reasons：根据各子分数超过阈值的因子生成，取 top 3
- reportHash：`0x` + keccak256(canonical JSON) 的 hex（使用 pycryptodome）
- degradationDetected：riskScoreBps > 5000

## 7. Codex 执行 Prompt

> 将以下内容完整粘贴给 Codex 执行。

---

你正在为 CopyGuard Bond 项目实现 Python FastAPI 后端。项目根目录是当前工作目录，后端代码在 `agents/risk-worker/`。

### 当前状态

- `agents/risk-worker/main.py` 已存在，是一个 FastAPI hello world（/health endpoint + CORS）
- `agents/risk-worker/requirements.txt` 已存在，包含所有依赖
- Python venv 已在 `agents/risk-worker/.venv/`

### 需要创建的文件

#### 1. agents/risk-worker/config.py

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    LLM_PROVIDER: str | None = None
    LLM_API_KEY: str | None = None
    ARC_RPC_URL: str = "https://rpc.testnet.arc.network"
    ORACLE_PRIVATE_KEY: str | None = None
    BOND_VAULT_ADDRESS: str | None = None
    RISK_ORACLE_ADAPTER_ADDRESS: str | None = None
    REPORT_PAYMENT_ADDRESS: str | None = None
    LEADER_REGISTRY_ADDRESS: str | None = None

    class Config:
        env_file = ".env"

settings = Settings()
```

#### 2. agents/risk-worker/schemas.py

Pydantic v2 models：

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

#### 3. agents/risk-worker/mock_data.py

5 个 leader，每个 30 天 daily snapshot。每个 snapshot 是一个 `LeaderMetrics` 对象。

Leader 配置：
- hl_leader_01: "Alpha Whale" — healthy, consistent, risk ~1500-2500 bps
- hl_leader_02: "Steady Eddie" — healthy, conservative, risk ~1000-2000 bps
- hl_leader_03: "Reckless Raj" — degrading, aggressive, risk ~3000→8000 over 30 days
- hl_leader_04: "Danger Dan" — degrading, reckless, risk ~6000-9500 bps
- hl_leader_05: "Volatile Vera" — volatile but profitable, risk ~2000-6000 bps

**关键**：hl_leader_03 的 metrics 必须随天数恶化：
- Day 1-10: 较正常（drawdown ~0.1, winRate ~0.55, leverage ~4）
- Day 11-20: 开始退化（drawdown ~0.2, winRate ~0.45, leverage ~6）
- Day 21-30: 明显退化（drawdown ~0.35, winRate ~0.35, leverage ~9）

其他 leader 的 metrics 在 30 天内保持相对稳定。

Helper functions:
- `get_all_leaders() -> list[Leader]` — 返回所有 5 个 leader（metrics 为最新一天）
- `get_leader(leader_id: str) -> Leader | None` — 按 id 查找
- `get_latest_metrics(leader_id: str) -> LeaderMetrics | None` — 返回最新一天的 metrics
- `get_metrics_history(leader_id: str) -> list[tuple[str, LeaderMetrics]]` — 返回完整 30 天历史

#### 4. agents/risk-worker/scoring.py

Deterministic risk scoring function:

```python
def calculate_risk_score(metrics: LeaderMetrics) -> int:
```

加权公式（每个子分数归一化到 0-10000）：
- 25% drawdown_acceleration：基于 maxDrawdown7d vs maxDrawdown30d
- 20% win_rate_decay：基于 winRate30d - winRate7d 差值
- 20% leverage_regime_shift：基于 avgLeverage 绝对值
- 15% position_concentration：基于 positionConcentration
- 10% trade_frequency_anomaly：基于 tradeFrequencyChange 偏离 1.0
- 10% volatility_adjusted_pnl_decay：基于 pnl7d vs pnl30d

Clamp 到 0-10000。**相同输入必须产生相同输出**。无随机、无外部调用。

Additional function:
```python
def generate_reasons(metrics: LeaderMetrics, risk_score_bps: int) -> list[str]:
```
根据各因子是否超过阈值生成可读 reasons，取 top 3。

#### 5. 修改 agents/risk-worker/main.py

保留现有 CORS 配置和 /health endpoint。添加以下 endpoints：

```python
from config import settings
from schemas import Leader, RiskSummary, RiskReport, RiskCheckRequest
from mock_data import get_all_leaders, get_leader, get_latest_metrics
from scoring import calculate_risk_score, generate_reasons
from Crypto.Hash import keccak
import json

@app.get("/api/leaders")
async def list_leaders():
    # 返回 get_all_leaders()

@app.get("/api/leaders/{leader_id}")
async def get_leader_detail(leader_id: str):
    # 返回 get_leader(leader_id)，404 if not found

@app.get("/api/risk/{leader_id}")
async def get_risk_summary(leader_id: str):
    # 获取 metrics → calculate_risk_score → 返回 RiskSummary
    # action: <3000 FOLLOW, 3000-7000 REDUCE, >7000 EXIT
    # summaryReason: reasons[0] if reasons else "No significant risk detected"

@app.post("/api/oracle/run-risk-check")
async def run_risk_check(request: RiskCheckRequest):
    # 获取 metrics → calculate_risk_score → generate_reasons
    # 构建 RiskReport:
    #   degradationDetected = riskScoreBps > 5000
    #   action from riskScoreBps ranges
    #   bondAction = "NONE" (no chain submit in Task 5)
    #   recommendedAllocationBps = max(0, 10000 - riskScoreBps)
    #   confidenceBps = 7500
    #   reportHash = keccak256 of canonical JSON (sorted keys, no whitespace)
    # 不提交链上（Task 7 才做）
```

### 约束

- 不调用 LLM（Task 6 才做）
- 不接真实 Hyperliquid / Nansen API
- 不提交链上交易（Task 7 才做）
- 不修改 contracts/ 下的任何文件
- 不修改 apps/ 下的任何文件
- 不修改 requirements.txt
- 保持 main.py 中的 CORS 配置和 /health endpoint
- 所有 risk scoring 必须是 deterministic（相同输入 → 相同输出）

### 验证

完成后运行：
```bash
cd agents/risk-worker
.venv\Scripts\activate
uvicorn main:app --reload
```

在另一个终端测试：
```bash
curl http://localhost:8000/api/leaders
curl http://localhost:8000/api/leaders/hl_leader_03
curl http://localhost:8000/api/risk/hl_leader_03
curl -X POST http://localhost:8000/api/oracle/run-risk-check -H "Content-Type: application/json" -d "{\"leaderId\":\"hl_leader_03\",\"bondId\":1}"
```

验证：
1. `/api/leaders` 返回 5 个 leader
2. `/api/risk/hl_leader_03` 返回 riskScoreBps 在 3000-8000 范围（degrading leader）
3. `/api/risk/hl_leader_01` 返回 riskScoreBps 在 1000-2500 范围（healthy leader）
4. 同一 leader 连续两次请求返回完全相同的 riskScoreBps
5. `/api/oracle/run-risk-check` 返回完整 RiskReport，包含 reportHash（0x... 开头的 64 字符 hex）

---

## 8. 验收 Checklist

| # | 检查项 | 验证方式 |
|---|---|---|
| 1 | config.py 存在，Settings 类包含所有字段 | `ls agents/risk-worker/config.py` + 读文件 |
| 2 | schemas.py 存在，包含 LeaderMetrics, Leader, RiskSummary, RiskReport, RiskCheckRequest | `ls agents/risk-worker/schemas.py` + 读文件 |
| 3 | mock_data.py 存在，5 个 leader + 30 天 snapshot | `ls agents/risk-worker/mock_data.py` + 读文件 |
| 4 | scoring.py 存在，calculate_risk_score + generate_reasons | `ls agents/risk-worker/scoring.py` + 读文件 |
| 5 | main.py 更新，保留 CORS + /health | 读 main.py |
| 6 | 4 个 API endpoints 存在 | 读 main.py |
| 7 | uvicorn 启动成功 | `uvicorn main:app --reload` |
| 8 | GET /api/leaders 返回 5 个 leader | `curl localhost:8000/api/leaders` |
| 9 | GET /api/leaders/:id 返回详情 | `curl localhost:8000/api/leaders/hl_leader_03` |
| 10 | GET /api/risk/:id 返回 risk summary + riskScoreBps | `curl localhost:8000/api/risk/hl_leader_03` |
| 11 | POST /api/oracle/run-risk-check 返回完整 RiskReport | `curl -X POST ...` |
| 12 | Deterministic：同一 leader 连续请求返回相同 riskScoreBps | 连续 2 次 curl 比较 |
| 13 | riskScoreBps 范围合理：leader_01 ~1000-2500, leader_03 ~3000-8000 | 检查不同 leader 的分数 |
| 14 | reportHash 格式正确（0x + 64 hex chars） | 检查 run-risk-check 响应 |
| 15 | 未修改 contracts/ | `git diff contracts/` 无变更 |
| 16 | 未修改 apps/ | `git diff apps/` 无变更 |
