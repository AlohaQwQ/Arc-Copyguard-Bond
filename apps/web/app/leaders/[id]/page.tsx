"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { BondCreateModal } from "@/components/bond-create-modal"
import { RiskCard } from "@/components/risk-card"
import { Button } from "@/components/ui/button"
import { WalletConnect } from "@/components/wallet-connect"
import { useLeader, useRisk } from "@/hooks/use-leaders"

export default function LeaderDetailPage() {
  const params = useParams<{ id: string }>()
  const leaderId = params.id
  const { data: leader, isLoading: leaderLoading, isError: leaderError } = useLeader(leaderId)
  const { data: risk, isLoading: riskLoading, isError: riskError } = useRisk(leaderId)

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Button asChild variant="outline">
          <Link href="/leaders">Back to Leaders</Link>
        </Button>
        <WalletConnect />
      </div>

      {leaderLoading && <p className="text-muted-foreground">Loading leader...</p>}
      {leaderError && <p className="text-destructive">Leader not found or API unavailable.</p>}
      {leader && (
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-2xl border bg-card p-6">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Leader Profile</p>
            <h1 className="mt-3 text-4xl font-bold">{leader.name}</h1>
            <p className="mt-2 text-muted-foreground">{leader.venue}</p>
            {leader.metrics && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Metric label="7d PnL" value={`${(leader.metrics.pnl7d * 100).toFixed(2)}%`} />
                <Metric label="30d PnL" value={`${(leader.metrics.pnl30d * 100).toFixed(2)}%`} />
                <Metric label="7d Max Drawdown" value={`${(leader.metrics.maxDrawdown7d * 100).toFixed(2)}%`} />
                <Metric label="Avg Leverage" value={`${leader.metrics.avgLeverage.toFixed(1)}x`} />
              </div>
            )}
          </section>

          <div className="grid gap-6">
            {riskLoading && <p className="rounded-2xl border p-5 text-muted-foreground">Loading risk summary...</p>}
            {riskError && <p className="rounded-2xl border p-5 text-destructive">Risk summary unavailable.</p>}
            {risk && <RiskCard risk={risk} />}
            <BondCreateModal leaderId={leader.id} />
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="text-xl font-semibold">Full report unlock coming soon</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                x402 unlock flow will be implemented later. This task only reserves the report area.
              </p>
            </section>
          </div>
        </div>
      )}
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}
