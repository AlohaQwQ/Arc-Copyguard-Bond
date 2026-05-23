import { http } from "wagmi"
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi"
import type { AppKitNetwork } from "@reown/appkit/networks"

import { arcTestnet } from "./arc"

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""

export const networks = [
  arcTestnet as unknown as AppKitNetwork,
] as [AppKitNetwork, ...AppKitNetwork[]]

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
  transports: {
    [arcTestnet.id]: http(
      process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network"
    ),
  },
})

export const config = wagmiAdapter.wagmiConfig