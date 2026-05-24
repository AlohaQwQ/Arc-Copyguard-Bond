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

export type Report402Response = {
  status: 402
  message?: string
  price?: string
  priceHuman?: string
  recipient?: string
  resource?: string
  chainId?: number
  contractAddress?: string
  instructions?: string
  verificationError?: string
}

export type FullReport = {
  leaderId: string
  riskScoreBps: number
  degradationDetected: boolean
  action: string
  recommendedAllocationBps: number
  confidenceBps: number
  reasons: string[]
  reportHash: string
  bondAction?: string
  txHash?: string
}

export type ReportFetchResult =
  | { status: "locked"; data: Report402Response }
  | { status: "unlocked"; data: FullReport }
  | { status: "error"; message: string }

export async function fetchReport(
  leaderId: string,
  txHash?: string,
  walletAddress?: string,
): Promise<ReportFetchResult> {
  try {
    const headers: Record<string, string> = {}

    if (txHash && walletAddress) {
      headers["X-Payment-Tx-Hash"] = txHash
      headers["X-Wallet-Address"] = walletAddress
    }

    const res = await fetch(`/api/reports/${leaderId}`, { headers })

    if (res.status === 402) {
      const data = (await res.json()) as Report402Response
      return { status: "locked", data }
    }

    if (res.ok) {
      const data = (await res.json()) as FullReport
      return { status: "unlocked", data }
    }

    return { status: "error", message: `Server error: ${res.status}` }
  } catch {
    return { status: "error", message: "Unable to connect to report service" }
  }
}
