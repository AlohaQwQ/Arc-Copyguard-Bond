export type LeaderMetrics = {
  pnl7d: number
  pnl30d: number
  maxDrawdown7d: number
  maxDrawdown30d: number
  winRate7d: number
  winRate30d: number
  avgLeverage: number
  positionConcentration: number
  tradeFrequencyChange: number
}

export type Leader = {
  id: string
  name: string
  venue: string
  metrics: LeaderMetrics
}

export type LeaderSnapshot = {
  date: string
  metrics: LeaderMetrics
}

export type LeaderDetail = Leader & {
  metricsHistory: LeaderSnapshot[]
}

export type RiskSummary = {
  leaderId: string
  riskScoreBps: number
  action: "FOLLOW" | "REDUCE" | "EXIT"
  confidenceBps: number
  summaryReason: string
}

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<T>
}
