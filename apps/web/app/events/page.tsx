import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function EventsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-10">
      <section className="rounded-3xl border bg-card p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Events</p>
        <h1 className="mt-4 text-4xl font-bold">On-chain event stream coming soon</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          This placeholder reserves the events page for a later task. Real getLogs polling and event decoding are not part of Task 8A.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild>
            <Link href="/leaders">View Leaders</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back Home</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
