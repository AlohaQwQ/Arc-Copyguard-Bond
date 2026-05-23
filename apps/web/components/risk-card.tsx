import type { RiskSummary } from "@/lib/api"
import { cn } from "@/lib/utils"

export function riskTone(score: number) {
  if (score < 3000) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
  if (score <= 7000) return "border-amber-500/30 bg-amber-500/10 text-amber-700"
  return "border-red-500/30 bg-red-500/10 text-red-700"
}

export function actionTone(action: RiskSummary["action"]) {
  if (action === "FOLLOW") return "bg-emerald-100 text-emerald-800"
  if (action === "REDUCE") return "bg-amber-100 text-amber-800"
  return "bg-red-100 text-red-800"
}

export function RiskCard({ risk }: { risk: RiskSummary }) {
  const percent = Math.min(100, Math.max(0, risk.riskScoreBps / 100))

  return (
    <section className={cn("rounded-2xl border p-5", riskTone(risk.riskScoreBps))}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium opacity-80">AI Risk Score</p>
          <h2 className="mt-1 text-3xl font-bold">{risk.riskScoreBps} bps</h2>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", actionTone(risk.action))}>
          {risk.action}
        </span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-background/70">
        <div className="h-full rounded-full bg-current transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-4 text-sm">Confidence: {risk.confidenceBps} bps</p>
      <p className="mt-2 text-sm text-foreground/80">{risk.summaryReason}</p>
    </section>
  )
}
