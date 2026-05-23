"use client"

import { type ReactNode, useState } from "react"
import { createAppKit } from "@reown/appkit/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"
import { arcTestnet } from "@/lib/arc"
import { config, networks, projectId, wagmiAdapter } from "@/lib/wagmi"

const metadata = {
  name: "CopyGuard Bond",
  description: "Arc-native social trading protection layer",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
}

let appKitInitialized = false

function ensureAppKit() {
  if (appKitInitialized || !projectId) return

  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata,
    defaultNetwork: arcTestnet,
  })

  appKitInitialized = true
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  ensureAppKit()

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
