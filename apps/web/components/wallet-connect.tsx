"use client"

import { useAppKit, useAppKitAccount } from "@reown/appkit/react"
import { useBalance, useDisconnect } from "wagmi"
import { Button } from "@/components/ui/button"
import { ARC_CHAIN_ID } from "@/lib/arc"
import { projectId } from "@/lib/wagmi"

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function WalletConnect() {
  if (!projectId) {
    return (
      <div className="rounded-xl border border-amber-300/40 bg-amber-50 p-4 text-sm text-amber-900">
        WalletConnect Project ID not configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to enable wallet login.
      </div>
    )
  }

  return <WalletConnectControls />
}

function WalletConnectControls() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({
    address: address as `0x${string}` | undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(address) },
  })

  if (!isConnected || !address) {
    return <Button onClick={() => open()}>Connect Wallet</Button>
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-sm sm:flex-row sm:items-center">
      <div>
        <div className="font-medium">{shortAddress(address)}</div>
        <div className="text-muted-foreground">
          {balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : "USDC balance loading"}
        </div>
      </div>
      <Button variant="outline" onClick={() => disconnect()}>
        Disconnect
      </Button>
    </div>
  )
}
