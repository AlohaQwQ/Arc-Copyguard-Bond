"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { BondCreateModal } from "@/components/bond-create-modal"
import { MyBondCard } from "@/components/my-bond-card"
import { ReportPaywall } from "@/components/report-paywall"
import { RiskCard } from "@/components/risk-card"
import { Button } from "@/components/ui/button"
import { WalletConnect } from "@/components/wallet-connect"
import { useLeader, useRisk } from "@/hooks/use-leaders"
import { useUserBond } from "@/hooks/use-user-bond"

export default function LeaderDetailPage() {
  const params = useParams<{ id: string }>()
  const leaderId = params.id
  const { data: leader, isLoading: leaderLoading, isError: leaderError } = useLeader(leaderId)
  const { data: risk, isLoading: riskLoading, isError: riskError } = useRisk(leaderId)
  const { bond, error: bondError, isConnected, isLoading: bondLoading } = useUserBond(leaderId)

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
            <MyBondSection
              bond={bond}
              error={bondError}
              isConnected={isConnected}
              isLoading={bondLoading}
            />
            <BondCreateModal leaderId={leader.id} />
            <ReportPaywall leaderId={leader.id} />
          </div>
        </div>
      )}
    </main>
  )
}

function MyBondSection({
  bond,
  error,
  isConnected,
  isLoading,
}: {
  bond: ReturnType<typeof useUserBond>["bond"]
  error: string | null
  isConnected: boolean
  isLoading: boolean
}) {
  if (!isConnected) {
    return (
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-semibold">My Bond</h2>
        <p className="mt-2 text-sm text-muted-foreground">Connect wallet to view your bonds.</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-semibold">My Bond</h2>
        <p className="mt-2 text-sm text-destructive">{error}</p>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-semibold">My Bond</h2>
        <div className="mt-4 grid gap-3">
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      </section>
    )
  }

  if (!bond) {
    return (
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-semibold">My Bond</h2>
        <p className="mt-2 text-sm text-muted-foreground">No protection bond yet for this leader.</p>
      </section>
    )
  }

  return <MyBondCard bond={bond} />
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}
