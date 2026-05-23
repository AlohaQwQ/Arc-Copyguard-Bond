"use client"

import Link from "next/link"
import type { Leader } from "@/lib/api"
import { useRisk } from "@/hooks/use-leaders"
import { RiskCard, actionTone, riskTone } from "@/components/risk-card"
import { cn } from "@/lib/utils"

export function LeaderCard({ leader }: { leader: Leader }) {
  const { data: risk, isLoading, isError } = useRisk(leader.id)

  return (
    <Link
      href={`/leaders/${leader.id}`}
      className="block rounded-2xl border bg-card p-5 transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{leader.name}</h2>
          <p className="text-sm text-muted-foreground">{leader.venue}</p>
        </div>
        {risk && <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", actionTone(risk.action))}>{risk.action}</span>}
      </div>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading risk summary...</p>}
      {isError && <p className="mt-6 text-sm text-destructive">Risk summary unavailable.</p>}
      {risk && (
        <div className="mt-6 space-y-3">
          <div className={cn("inline-flex rounded-full border px-3 py-1 text-sm font-medium", riskTone(risk.riskScoreBps))}>
            {risk.riskScoreBps} bps
          </div>
          <p className="text-sm text-muted-foreground">Confidence: {risk.confidenceBps} bps</p>
          <p className="line-clamp-2 text-sm">{risk.summaryReason}</p>
        </div>
      )}
    </Link>
  )
}

export function LeaderRiskPreview({ leader }: { leader: Leader }) {
  const { data: risk } = useRisk(leader.id)
  if (!risk) return null
  return <RiskCard risk={risk} />
}
