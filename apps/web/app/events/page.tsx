"use client"

import Link from "next/link"
import { EventFeed } from "@/components/event-feed"

export default function EventsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm text-muted-foreground underline">
          Back Home
        </Link>
        <p className="mt-6 text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Events</p>
        <h1 className="mt-2 text-4xl font-bold">On-chain Event Stream</h1>
        <p className="mt-2 text-muted-foreground">
          Real-time events from CopyGuard Bond contracts on Arc Testnet.
        </p>
      </div>
      <EventFeed />
    </main>
  )
}
