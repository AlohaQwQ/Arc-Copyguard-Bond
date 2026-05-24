"use client"

import { useMemo, useState } from "react"
import { formatUnits } from "viem"
import { Button } from "@/components/ui/button"
import { txUrl } from "@/lib/arc"
import { cn } from "@/lib/utils"
import { type DecodedEvent, type EventCategory, useEvents } from "@/hooks/use-events"

type Filter = "all" | EventCategory

const filters: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Bonds", value: "bonds" },
  { label: "Risk", value: "risk" },
  { label: "Reports", value: "reports" },
]

export function EventFeed() {
  const [filter, setFilter] = useState<Filter>("all")
  const { events, isError, isFetching, isLoading, partial, refetch, warning } = useEvents()
  const filteredEvents = useMemo(
    () => (filter === "all" ? events : events.filter((event) => event.category === filter)),
    [events, filter],
  )

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <Button
            key={item.value}
            variant={filter === item.value ? "default" : "outline"}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Polling every 10 seconds. Showing events from the latest 120,000 Arc Testnet blocks.
        {isFetching && !isLoading ? " Refreshing..." : ""}
      </p>

      {partial && (
        <div className="rounded-2xl border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-900">
          {warning || "Some event ranges could not be loaded from Arc RPC. Showing partial results."}
        </div>
      )}

      {isLoading && <EventSkeleton />}

      {isError && (
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-destructive">Unable to load events from Arc Testnet.</p>
          <Button className="mt-4" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !isError && filteredEvents.length === 0 && (
        <div className="rounded-2xl border bg-card p-6 text-muted-foreground">
          No on-chain events found yet. Events will appear as bonds are created and risk checks are performed.
        </div>
      )}

      {!isLoading && !isError && filteredEvents.length > 0 && (
        <div className="grid gap-3">
          {filteredEvents.map((event, index) => (
            <EventRow key={`${event.transactionHash}-${event.logIndex ?? `${event.type}-${index}`}`} event={event} />
          ))}
        </div>
      )}
    </section>
  )
}

function EventSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="rounded-2xl border bg-card p-5">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-4 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

function EventRow({ event }: { event: DecodedEvent }) {
  return (
    <article className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", eventTone(event.type))}>
          {event.type}
        </span>
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {event.contractLabel}
        </span>
        <span className="text-sm text-muted-foreground">Block {event.blockNumber.toString()}</span>
      </div>
      <p className="mt-4 text-lg font-medium">{summarizeEvent(event)}</p>
      <a
        className="mt-3 block break-all text-sm text-primary underline"
        href={txUrl(event.transactionHash)}
        target="_blank"
        rel="noreferrer"
      >
        {shortHash(event.transactionHash)}
      </a>
    </article>
  )
}

function summarizeEvent(event: DecodedEvent) {
  const args = event.args

  switch (event.type) {
    case "BondCreated":
      return `Bond #${formatValue(args.bondId)} by ${shortAddress(args.follower)} for ${formatUsdc(args.amount)} USDC`
    case "RiskUpdated":
      return `Bond #${formatValue(args.bondId)} risk score ${formatValue(args.riskScoreBps)} bps`
    case "BondWarned":
      return `Bond #${formatValue(args.bondId)} warned at ${formatValue(args.riskScoreBps)} bps`
    case "BondSlashed":
      return `Bond #${formatValue(args.bondId)} slashed for ${formatUsdc(args.slashedAmount)} USDC`
    case "BondRefunded":
      return `Bond #${formatValue(args.bondId)} refunded ${formatUsdc(args.amount)} USDC`
    case "BondSettled":
      return `Bond #${formatValue(args.bondId)} settled`
    case "ReportPurchased":
      return `${shortAddress(args.user)} purchased report for ${formatUsdc(args.amount)} USDC`
    case "RiskUpdateForwarded":
      return `Oracle ${shortAddress(args.oracle)} forwarded risk score ${formatValue(args.riskScoreBps)} bps for bond #${formatValue(args.bondId)}`
    default:
      return `${event.type} emitted by ${event.contractLabel}`
  }
}

function eventTone(type: string) {
  if (type === "BondCreated") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
  if (type === "RiskUpdated" || type === "RiskUpdateForwarded") return "border-blue-500/30 bg-blue-500/10 text-blue-700"
  if (type === "BondWarned") return "border-amber-500/30 bg-amber-500/10 text-amber-700"
  if (type === "BondSlashed") return "border-red-500/30 bg-red-500/10 text-red-700"
  if (type === "ReportPurchased") return "border-purple-500/30 bg-purple-500/10 text-purple-700"
  return "border-muted bg-muted text-muted-foreground"
}

function formatValue(value: unknown) {
  if (typeof value === "bigint") return value.toString()
  if (typeof value === "number") return String(value)
  if (typeof value === "string") return value
  return "unknown"
}

function formatUsdc(value: unknown) {
  if (typeof value === "bigint") return formatUnits(value, 18)
  return formatValue(value)
}

function shortAddress(value: unknown) {
  if (typeof value !== "string") return "unknown"
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

function shortHash(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-8)}`
}
