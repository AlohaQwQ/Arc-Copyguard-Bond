# Task 6: LLM Rationale + Deterministic Fallback — 完整执行上下文

## 1. 目标

在现有 deterministic scoring 基础上增加 LLM rationale 生成能力。LLM 只负责生成用户可读的 reasons 解释，不决定任何链上状态参数。当 LLM 不可用或失败时，回退到现有的 generate_reasons() 确定性路径。两条路径输出完全相同的 JSON schema。

## 2. 需要创建/修改的文件

| 操作 | 文件 |
|---|---|
| 创建 | `agents/risk-worker/llm.py` |
| 修改 | `agents/risk-worker/main.py` |
| 不修改 | `agents/risk-worker/scoring.py` |
| 不修改 | `agents/risk-worker/schemas.py` |
| 不修改 | `agents/risk-worker/mock_data.py` |
| 不修改 | `agents/risk-worker/config.py` |
| 不修改 | `agents/risk-worker/requirements.txt` |
| 不修改 | `contracts/*`、`apps/*` |

## 3. LLM Rationale 职责边界

**LLM 可以做的事**：
- 生成可读的 reasons 数组（解释为什么某个 leader 有风险）
- 总结 metrics 变化趋势
- 提供自然语言的投资建议说明

**LLM 不能做的事**（由 rule-based scoring 决定）：
- 不能决定 `riskScoreBps` — 由 `calculate_risk_score()` 决定
- 不能决定 `action` — 由 `_action_for_score(riskScoreBps)` 决定
- 不能决定 `bondAction` — 由 risk vs threshold 比较（Task 7 从链上读取 threshold）
- 不能决定 `recommendedAllocationBps` — 公式 `max(0, 10000 - riskScoreBps)`
- 不能决定 `confidenceBps` — deterministic fallback 固定 7500

**关键原则**：LLM 的输出只影响 `reasons` 字段。即使 LLM 返回了 action/riskScore 等字段，这些字段也必须被忽略，以 rule-based 值为准。

## 4. Deterministic Fallback 规则

当以下任一情况发生时，回退到确定性路径：
- `LLM_PROVIDER` 环境变量未设置（None / 空字符串）
- `LLM_API_KEY` 环境变量未设置
- LLM API 调用超时（建议 10 秒）
- LLM API 返回非 200 状态码
- LLM 返回的 JSON 无法解析
- LLM 返回的 JSON 缺少 `reasons` 字段
- `reasons` 不是字符串数组
- 任何其他异常

Fallback 路径直接调用现有的 `scoring.generate_reasons(metrics, risk_score_bps)`，与 Task 5 行为完全一致。

## 5. 严格 JSON Schema

LLM 必须输出严格匹配此 schema 的 JSON（prompt 中强制要求）：

```json
{
  "reasons": [
    "string — 解释原因 1",
    "string — 解释原因 2",
    "string — 解释原因 3"
  ]
}
```

只有 `reasons` 字段来自 LLM。其他所有字段由 rule-based 逻辑生成。

解析规则：
- 必须是有效 JSON
- 必须有 `reasons` 键
- `reasons` 必须是非空字符串数组
- 每条 reason 长度 10-200 字符
- 最多取前 5 条 reason
- 不满足以上任何条件 → fallback

## 6. 需要新增或修改的 Endpoint

### 修改: POST /api/oracle/run-risk-check

当前流程（Task 5）：
```
metrics → calculate_risk_score → generate_reasons → construct payload → reportHash → return RiskReport
```

新流程（Task 6）：
```
metrics → calculate_risk_score → try LLM reasons → fallback if fail → construct payload → reportHash → return RiskReport
```

具体改动：
1. 从 `scoring.generate_reasons` 改为 `llm.generate_rationale(metrics, risk_score_bps)`
2. `llm.generate_rationale` 内部：尝试 LLM → 失败则回退 `scoring.generate_reasons`
3. `reasons` 字段由 `llm.generate_rationale` 返回
4. 其他所有字段不变

### 新增: GET /api/reports/{leader_id}

Task 6 阶段返回 402（为 Task 7 x402 流程预留）：

```python
@app.get("/api/reports/{leader_id}")
async def get_report(leader_id: str):
    metrics = get_latest_metrics(leader_id)
    if metrics is None:
        raise HTTPException(status_code=404, detail="leader not found")
    return JSONResponse(
        status_code=402,
        content={
            "status": 402,
            "message": "Payment required",
            "price": "1000000000000000000",
            "priceHuman": "1 USDC",
            "resource": f"report:{leader_id}",
        }
    )
```

## 7. Codex 执行 Prompt

> 将以下内容完整粘贴给 Codex 执行。

---

你正在为 CopyGuard Bond 项目添加 LLM rationale 功能。后端代码在 `agents/risk-worker/`。

### 当前代码状态

**agents/risk-worker/config.py** 已有：
- `LLM_PROVIDER: str | None = None`
- `LLM_API_KEY: str | None = None`

**agents/risk-worker/main.py** 当前 POST /api/oracle/run-risk-check 流程：
```python
risk_score_bps = calculate_risk_score(metrics)
reasons = generate_reasons(metrics, risk_score_bps)
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
return RiskReport(**payload, reportHash=_hash_report(payload))
```

**agents/risk-worker/scoring.py** 已有 `generate_reasons(metrics, risk_score_bps) -> list[str]`

### 需要做的事

#### 1. 创建 agents/risk-worker/llm.py

实现函数 `generate_rationale(metrics: LeaderMetrics, risk_score_bps: int) -> list[str]`：

**LLM 路径**（当 LLM_PROVIDER 和 LLM_API_KEY 都已设置时）：
- 根据 `LLM_PROVIDER` 选择 SDK：
  - `"claude"` → 使用 `anthropic` SDK（需 `pip install anthropic`）
  - `"openai"` → 使用 `openai` SDK（需 `pip install openai`）
  - `"gemini"` → 使用 `google.genai` SDK（需 `pip install google-genai`）
- 构建 prompt，要求 LLM 输出严格 JSON：
  ```
  You are a crypto trading risk analyst. Based on the following leader metrics and computed risk score, generate a brief risk analysis.

  Risk Score: {risk_score_bps}/10000 basis points

  Leader Metrics (latest):
  - 7d PnL: {pnl7d}, 30d PnL: {pnl30d}
  - 7d Max Drawdown: {maxDrawdown7d}, 30d Max Drawdown: {maxDrawdown30d}
  - 7d Win Rate: {winRate7d}, 30d Win Rate: {winRate30d}
  - Avg Leverage: {avgLeverage}x
  - Position Concentration: {positionConcentration}
  - Trade Frequency Change: {tradeFrequencyChange}x

  Respond ONLY with valid JSON in this exact format, no other text:
  {"reasons": ["reason 1", "reason 2", "reason 3"]}
  ```
- 解析 LLM 响应：
  - 必须是有效 JSON
  - 必须有 `reasons` 键，值为非空字符串数组
  - 每条 reason 10-200 字符
  - 最多取前 5 条
  - 不满足 → 回退到 deterministic

**Fallback 路径**（LLM_PROVIDER 未设置，或 LLM 调用失败）：
- 直接调用 `from scoring import generate_reasons`
- 返回 `generate_reasons(metrics, risk_score_bps)`

**错误处理**：
- 所有 LLM 调用用 try/except 包裹
- 超时 10 秒
- 任何异常 → 静默回退到 deterministic，打印 warning log
- 不要让 LLM 错误导致 API 请求失败

**重要**：LLM 输出只影响 `reasons` 字段。riskScoreBps、action、bondAction、confidenceBps 等字段完全由 rule-based 逻辑决定。

#### 2. 修改 agents/risk-worker/main.py

修改 `run_risk_check` 函数：

将：
```python
reasons = generate_reasons(metrics, risk_score_bps)
```
改为：
```python
from llm import generate_rationale
reasons = generate_rationale(metrics, risk_score_bps)
```

其他代码不变。`generate_reasons` import 可保留（llm.py 内部使用）或移除。

新增 endpoint：
```python
@app.get("/api/reports/{leader_id}")
async def get_report(leader_id: str):
    metrics = get_latest_metrics(leader_id)
    if metrics is None:
        raise HTTPException(status_code=404, detail="leader not found")
    return JSONResponse(
        status_code=402,
        content={
            "status": 402,
            "message": "Payment required",
            "price": "1000000000000000000",
            "priceHuman": "1 USDC",
            "resource": f"report:{leader_id}",
        }
    )
```

需要在 main.py 顶部添加 `from fastapi.responses import JSONResponse`。

### 约束

- LLM 不能决定 riskScoreBps、action、bondAction — 这些由 rule-based 逻辑决定
- LLM 失败/超时/返回非法 JSON → 必须静默回退到 deterministic reasons
- 不提交链上交易（Task 7 才做）
- 不修改 contracts/ 下的任何文件
- 不修改 apps/ 下的任何文件
- 不修改 scoring.py、mock_data.py、schemas.py、config.py
- 不修改 requirements.txt（LLM SDK 由用户按需安装）
- 保持 main.py 中现有的 CORS 配置和所有现有 endpoint
- GET /api/reports/{leader_id} Task 6 阶段只返回 402，完整 x402 流程在 Task 7

### 验证

完成后运行：
```bash
cd agents/risk-worker
.venv\Scripts\activate
uvicorn main:app --reload
```

测试：
```bash
# 1. 不设置 LLM_PROVIDER（deterministic fallback）
curl -X POST http://localhost:8000/api/oracle/run-risk-check -H "Content-Type: application/json" -d "{\"leaderId\":\"hl_leader_03\",\"bondId\":1}"
# 应返回完整的 RiskReport，reasons 来自 deterministic 路径

# 2. 同一 leader 连续两次请求
curl -X POST http://localhost:8000/api/oracle/run-risk-check -H "Content-Type: application/json" -d "{\"leaderId\":\"hl_leader_03\",\"bondId\":1}"
# riskScoreBps 必须与第一次完全相同

# 3. 新的 /api/reports endpoint
curl -v http://localhost:8000/api/reports/hl_leader_03
# 应返回 402 状态码

# 4. 不存在的 leader
curl http://localhost:8000/api/reports/hl_leader_nonexist
# 应返回 404
```

---

## 8. 验收 Checklist

| # | 检查项 | 验证方式 |
|---|---|---|
| 1 | `agents/risk-worker/llm.py` 存在 | `ls agents/risk-worker/llm.py` |
| 2 | llm.py 包含 `generate_rationale(metrics, risk_score_bps)` | 读文件 |
| 3 | llm.py 支持三种 LLM provider | 读文件，检查 claude/openai/gemini 分支 |
| 4 | llm.py 有完整的 try/except + fallback | 读文件，检查异常处理 |
| 5 | fallback 调用 `scoring.generate_reasons` | 读文件 |
| 6 | main.py 的 run_risk_check 使用 llm.generate_rationale | 读 main.py |
| 7 | riskScoreBps 不受 LLM 影响 | 无 LLM_PROVIDER 时请求两次，riskScoreBps 相同 |
| 8 | action 不受 LLM 影响 | 验证 action 仍由 _action_for_score 决定 |
| 9 | GET /api/reports/{leader_id} 返回 402 | `curl -v localhost:8000/api/reports/hl_leader_03` |
| 10 | GET /api/reports/{leader_id} 不存在的 leader 返回 404 | `curl localhost:8000/api/reports/nonexist` |
| 11 | 未修改 scoring.py | `git diff agents/risk-worker/scoring.py` 无变更 |
| 12 | 未修改 schemas.py | `git diff agents/risk-worker/schemas.py` 无变更 |
| 13 | 未修改 mock_data.py | `git diff agents/risk-worker/mock_data.py` 无变更 |
| 14 | 未修改 config.py | `git diff agents/risk-worker/config.py` 无变更 |
| 15 | 未修改 contracts/ | `git diff contracts/` 无变更 |
| 16 | 未修改 apps/ | `git diff apps/` 无变更 |
| 17 | 保留 CORS + /health + 所有现有 endpoint | 读 main.py，确认全部存在 |
