"use client"

import Link from "next/link"
import { LeaderCard } from "@/components/leader-card"
import { Button } from "@/components/ui/button"
import { useLeaders } from "@/hooks/use-leaders"

export default function LeadersPage() {
  const { data: leaders, isLoading, isError } = useLeaders()

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Leader Registry</p>
          <h1 className="mt-3 text-4xl font-bold">Copy-trading leaders</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Review deterministic risk summaries before creating a protection bond.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Back Home</Link>
        </Button>
      </div>

      {isLoading && <p className="mt-10 text-muted-foreground">Loading leaders...</p>}
      {isError && <p className="mt-10 text-destructive">Unable to load leaders. Make sure FastAPI is running.</p>}
      {leaders?.length === 0 && <p className="mt-10 text-muted-foreground">No leaders found.</p>}
      {leaders && leaders.length > 0 && (
        <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {leaders.map((leader) => (
            <LeaderCard key={leader.id} leader={leader} />
          ))}
        </section>
      )}
    </main>
  )
}
