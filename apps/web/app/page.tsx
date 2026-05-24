import Link from "next/link"
import { WalletConnect } from "@/components/wallet-connect"

const primaryLink =
  "inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"

const secondaryLink =
  "inline-flex items-center justify-center rounded-xl border bg-background px-5 py-3 text-sm font-semibold transition hover:bg-muted"

const protectionSteps = [
  {
    title: "Review Leaders",
    description: "Review curated copy-trading leader profiles with deterministic risk scoring.",
  },
  {
    title: "Create Bond",
    description: "Connect wallet, select a leader, and create a protection bond with Arc native USDC.",
  },
  {
    title: "Unlock Report",
    description: "Pay 1 USDC on-chain through an x402-style flow to unlock the full AI risk report.",
  },
  {
    title: "Track Events",
    description: "Review Arc Testnet activity such as BondCreated, ReportPurchased, and RiskUpdated on the events page.",
  },
]

const capabilities = [
  "Curated leader profiles with deterministic risk scoring",
  "Arc Testnet contracts deployed (chainId 5042002)",
  "Protection bond creation confirmed on-chain",
  "User bond state read through multicall",
  "x402-style report unlock with on-chain payment proof",
  "Event stream reads getLogs from Arc RPC",
]

const architecture = [
  {
    title: "Native USDC flow",
    description: "All payments use Arc native msg.value, no ERC-20 approvals.",
  },
  {
    title: "Verifiable on Arcscan",
    description: "Every transaction is publicly auditable on testnet.arcscan.app.",
  },
  {
    title: "AI + deterministic fallback",
    description: "Risk scoring works with or without LLM, with stable scoring for the same input.",
  },
  {
    title: "x402-style paid access",
    description: "HTTP 402 negotiation with on-chain payment verification.",
  },
]

const entryPoints = [
  {
    href: "/leaders",
    title: "/leaders",
    description: "Browse leader risk profiles",
  },
  {
    href: "/leaders/hl_leader_03",
    title: "/leaders/hl_leader_03",
    description: "Open a high-risk leader profile",
  },
  {
    href: "/events",
    title: "/events",
    description: "Review the Arc Testnet event stream",
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-6 py-10 lg:px-8">
        <nav className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="text-lg font-semibold">
            CopyGuard Bond
          </Link>
          <div className="flex flex-wrap gap-3 text-sm font-medium">
            <Link href="/leaders" className="text-muted-foreground transition hover:text-foreground">
              Leaders
            </Link>
            <Link href="/leaders/hl_leader_03" className="text-muted-foreground transition hover:text-foreground">
              How It Works
            </Link>
            <Link href="/events" className="text-muted-foreground transition hover:text-foreground">
              Events
            </Link>
          </div>
        </nav>

        <section className="grid gap-8 rounded-[2rem] border bg-card p-6 shadow-sm md:p-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.35em] text-muted-foreground">
              ARC-NATIVE RISK PROTECTION
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl">
              CopyGuard Bond
            </h1>
            <p className="mt-5 max-w-2xl text-xl text-muted-foreground">
              Arc-native protection layer for copy-trading followers.
            </p>

            <ul className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              <li>✓ AI risk scoring with deterministic fallback</li>
              <li>✓ On-chain protection bond via Arc native USDC</li>
              <li>✓ x402-style report unlock</li>
              <li>✓ Arc Testnet activity tracking</li>
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/leaders" className={primaryLink}>
                View Leaders
              </Link>
              <Link href="/leaders/hl_leader_03" className={secondaryLink}>
                Open Risk Profile
              </Link>
              <Link href="/events" className={secondaryLink}>
                View Events
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border bg-background p-5">
            <p className="mb-4 text-sm font-medium text-muted-foreground">Wallet entry</p>
            <WalletConnect />
            <p className="mt-4 text-xs text-muted-foreground">
              Browse risk profiles without a wallet. Connect only when creating protection bonds or unlocking full reports.
            </p>
          </div>
        </section>

        <section>
          <SectionHeader
            eyebrow="Protection Flow"
            title="From risk review to on-chain protection"
            description="Users can review leader risk, create protection bonds, unlock full reports, and verify activity on Arc Testnet."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {protectionSteps.map((step, index) => (
              <div key={step.title} className="rounded-2xl border bg-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </div>
                <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader
            eyebrow="On-chain Capabilities"
            title="Operational on Arc Testnet"
            description="CopyGuard Bond combines deployed contracts, on-chain payments, report verification, and event reads."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {capabilities.map((item) => (
              <div key={item} className="rounded-2xl border bg-card p-4 text-sm">
                <span className="mr-2 text-emerald-600">✓</span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader
            eyebrow="Architecture"
            title="Why Arc"
            description="The flow uses native payments, public verification, deterministic scoring, and HTTP 402-style access control."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {architecture.map((item) => (
              <div key={item.title} className="rounded-2xl border bg-card p-5">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border bg-card p-6 md:p-8">
          <SectionHeader
            eyebrow="Entry Points"
            title="Explore CopyGuard Bond"
            description="Start from leader risk profiles, inspect bond protection, or review on-chain activity."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {entryPoints.map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                className="rounded-2xl border bg-background p-5 transition hover:-translate-y-1 hover:shadow-md"
              >
                <p className="font-mono text-sm text-primary">{entry.title}</p>
                <p className="mt-3 font-semibold">{entry.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight">{title}</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">{description}</p>
    </div>
  )
}
