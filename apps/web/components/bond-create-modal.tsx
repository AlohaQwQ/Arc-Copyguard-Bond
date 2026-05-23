"use client"

import { FormEvent, useMemo, useState } from "react"
import { parseUnits } from "viem"
import { useAppKitAccount } from "@reown/appkit/react"
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi"
import { Button } from "@/components/ui/button"
import { arcTestnet, txUrl } from "@/lib/arc"
import { BOND_VAULT_ABI, BOND_VAULT_ADDRESS, stringToBytes32 } from "@/lib/contracts"

export function BondCreateModal({ leaderId }: { leaderId: string }) {
  const { address, isConnected } = useAppKitAccount()
  const [amount, setAmount] = useState("1")
  const [riskThresholdBps, setRiskThresholdBps] = useState("7000")
  const [formError, setFormError] = useState<string | null>(null)
  const { data: txHash, error, isPending, writeContract } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: arcTestnet.id,
  })
  const expiryTimestamp = useMemo(() => Math.floor(Date.now() / 1000) + 30 * 86400, [])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    try {
      writeContract({
        address: BOND_VAULT_ADDRESS,
        abi: BOND_VAULT_ABI,
        functionName: "createBond",
        args: [
          stringToBytes32(leaderId),
          Number(riskThresholdBps),
          BigInt(expiryTimestamp),
        ],
        value: parseUnits(amount, 18),
        chainId: arcTestnet.id,
      })
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : "Failed to submit transaction")
    }
  }

  if (!isConnected || !address) {
    return (
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-semibold">Create protection bond</h2>
        <p className="mt-2 text-sm text-muted-foreground">Connect wallet to create bonds.</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-xl font-semibold">Create protection bond</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Send Arc native USDC as bond collateral. The default expiry is 30 days.
      </p>
      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm">
          Amount (USDC)
          <input
            className="rounded-lg border bg-background px-3 py-2"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm">
          Risk threshold (bps)
          <input
            className="rounded-lg border bg-background px-3 py-2"
            inputMode="numeric"
            min="0"
            max="10000"
            value={riskThresholdBps}
            onChange={(event) => setRiskThresholdBps(event.target.value)}
          />
        </label>
        <div className="text-sm text-muted-foreground">Expiry timestamp: {expiryTimestamp}</div>
        <Button type="submit" disabled={isPending || isConfirming}>
          {isPending ? "Confirm in wallet..." : isConfirming ? "Waiting for confirmation..." : "Create Bond"}
        </Button>
      </form>
      {(formError || error) && (
        <p className="mt-4 text-sm text-destructive">{formError || error?.message}</p>
      )}
      {txHash && (
        <div className="mt-4 rounded-xl border bg-background p-4 text-sm">
          <p className="font-medium">{isSuccess ? "Bond transaction confirmed" : "Transaction submitted"}</p>
          <a className="mt-2 block break-all text-primary underline" href={txUrl(txHash)} target="_blank" rel="noreferrer">
            {txHash}
          </a>
        </div>
      )}
    </section>
  )
}
