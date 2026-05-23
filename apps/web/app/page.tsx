import Link from "next/link"
import { WalletConnect } from "@/components/wallet-connect"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold">
            CopyGuard Bond
          </Link>
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link href="/leaders">Leaders</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/events">Events</Link>
            </Button>
          </div>
        </nav>

        <section className="grid gap-8 rounded-3xl border bg-card p-8 shadow-sm lg:grid-cols-[1.4fr_0.8fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Arc Testnet MVP</p>
            <h1 className="mt-5 max-w-3xl text-5xl font-bold tracking-tight">
              CopyGuard Bond
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              Arc-native protection layer for copy-trading followers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/leaders">View Leaders</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/events">View Events</Link>
              </Button>
            </div>
          </div>
          <WalletConnect />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["5 mock leaders", "Deterministic FastAPI leader and risk data"],
            ["Arc Testnet deployed", "Native USDC bond calls via msg.value"],
            ["x402 paid report ready", "Unlock flow is reserved for a later task"],
          ].map(([title, description]) => (
            <div key={title} className="rounded-2xl border bg-card p-5">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
