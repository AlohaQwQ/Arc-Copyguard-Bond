"use client"

import { formatUnits } from "viem"
import type { BondData } from "@/hooks/use-user-bond"
import { cn } from "@/lib/utils"

const bondStates = [
  { label: "Active", className: "bg-emerald-100 text-emerald-800" },
  { label: "Warned", className: "bg-amber-100 text-amber-800" },
  { label: "Slashed", className: "bg-red-100 text-red-800" },
  { label: "Refunded", className: "bg-blue-100 text-blue-800" },
  { label: "Settled", className: "bg-muted text-muted-foreground" },
] as const

function formatDate(timestamp: bigint) {
  return new Date(Number(timestamp) * 1000).toLocaleDateString()
}

function shortHex(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-8)}`
}

function isZeroHash(value: string) {
  return /^0x0+$/i.test(value)
}

export function MyBondCard({ bond }: { bond: BondData }) {
  const state = bondStates[bond.state] ?? {
    label: "Unknown",
    className: "bg-muted text-muted-foreground",
  }

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">My Bond</p>
          <h2 className="mt-2 text-2xl font-semibold">Bond #{bond.id.toString()}</h2>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", state.className)}>
          {state.label}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <BondField label="Amount" value={`${formatUnits(bond.amount, 18)} USDC`} />
        <BondField label="Risk Threshold" value={`${bond.riskThresholdBps} bps`} />
        <BondField
          label="Last Risk Score"
          value={bond.lastRiskScoreBps > 0 ? `${bond.lastRiskScoreBps} bps` : "Pending"}
        />
        <BondField label="Created At" value={formatDate(bond.createdAt)} />
        <BondField label="Expiry" value={formatDate(bond.expiry)} />
        <BondField label="Follower" value={shortHex(bond.follower)} />
      </div>

      <div className="mt-4 grid gap-2 rounded-xl border bg-background p-4 text-sm">
        <div>
          <span className="text-muted-foreground">Leader ID: </span>
          <span className="break-all font-mono">{shortHex(bond.leaderId)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Last Report Hash: </span>
          <span className="break-all font-mono">
            {isZeroHash(bond.lastReportHash) ? "Pending" : shortHex(bond.lastReportHash)}
          </span>
        </div>
      </div>
    </section>
  )
}

function BondField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}
