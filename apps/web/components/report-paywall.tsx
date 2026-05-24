"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAppKitAccount } from "@reown/appkit/react"
import { parseUnits } from "viem"
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi"
import { Button } from "@/components/ui/button"
import { actionTone, riskTone } from "@/components/risk-card"
import { arcTestnet, txUrl } from "@/lib/arc"
import { fetchReport, type FullReport, type Report402Response } from "@/lib/api"
import { REPORT_PAYMENT_ABI, REPORT_PAYMENT_ADDRESS, stringToBytes32 } from "@/lib/contracts"
import { cn } from "@/lib/utils"

type PaywallState = "idle" | "loading" | "locked" | "paying" | "confirming" | "verifying" | "unlocked" | "error"

const BACKEND_CONFIG_ERROR =
  "Backend report payment configuration is incomplete. Please set REPORT_PAYMENT_ADDRESS and restart FastAPI."
const INCOMPLETE_PAYMENT_CONFIG_ERROR =
  "Payment configuration is incomplete. Please check backend x402/report payment configuration."
const DUPLICATE_PURCHASE_HINT =
  "This report appears to have already been purchased by this wallet. Please use the original successful payment transaction, or clear the saved failed payment and retry verification."

export function ReportPaywall({ leaderId }: { leaderId: string }) {
  const { address, isConnected } = useAppKitAccount()
  const [state, setState] = useState<PaywallState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [paywallData, setPaywallData] = useState<Report402Response | null>(null)
  const [report, setReport] = useState<FullReport | null>(null)
  const [pendingPaymentTxHash, setPendingPaymentTxHash] = useState<`0x${string}` | undefined>()
  const [verifiedPaymentTxHash, setVerifiedPaymentTxHash] = useState<`0x${string}` | undefined>()
  const [failedPaymentTxHash, setFailedPaymentTxHash] = useState<`0x${string}` | undefined>()
  const [savedPaymentTxHash, setSavedPaymentTxHash] = useState<`0x${string}` | undefined>()
  const { writeContractAsync } = useWriteContract()
  const {
    data: paymentReceipt,
    error: receiptError,
    isError: isReceiptError,
  } = useWaitForTransactionReceipt({
    hash: pendingPaymentTxHash,
    chainId: arcTestnet.id,
    query: {
      enabled: Boolean(pendingPaymentTxHash),
    },
  })

  const paymentKey = address
    ? `copyguard:report-payment:${address.toLowerCase()}:${leaderId}`
    : null
  const paymentConfigError = useMemo(() => getPaymentConfigError(paywallData), [paywallData])
  const hasClearablePayment = Boolean(
    savedPaymentTxHash || pendingPaymentTxHash || verifiedPaymentTxHash || failedPaymentTxHash,
  )

  const doFetch = useCallback(
    async (txHash?: `0x${string}`, walletAddress?: string, loadingState: PaywallState = "loading") => {
      setState(loadingState)
      setError(null)

      const result = await fetchReport(leaderId, txHash, walletAddress)

      if (result.status === "unlocked") {
        setReport(result.data)
        if (txHash) {
          setVerifiedPaymentTxHash(txHash)
          if (paymentKey) localStorage.setItem(paymentKey, txHash)
        }
        setPendingPaymentTxHash(undefined)
        setFailedPaymentTxHash(undefined)
        setState("unlocked")
        return
      }

      if (result.status === "locked") {
        setPaywallData(result.data)

        if (result.data.verificationError === "report payment contract is not configured") {
          setError(BACKEND_CONFIG_ERROR)
          setState("locked")
          return
        }

        if (result.data.verificationError) {
          setError(getFriendlyError(result.data.verificationError))
          setState("error")
          return
        }

        setState("locked")
        return
      }

      setError(result.message)
      setState("error")
    },
    [leaderId, paymentKey],
  )

  useEffect(() => {
    setState("idle")
    setError(null)
    setPaywallData(null)
    setReport(null)
    setPendingPaymentTxHash(undefined)
    setVerifiedPaymentTxHash(undefined)
    setFailedPaymentTxHash(undefined)
    setSavedPaymentTxHash(undefined)
  }, [leaderId, address])

  useEffect(() => {
    if (state !== "idle") return

    const savedTxHash = paymentKey ? (localStorage.getItem(paymentKey) as `0x${string}` | null) : null
    if (address && savedTxHash) {
      setSavedPaymentTxHash(savedTxHash)
      void doFetch(savedTxHash, address, "verifying")
      return
    }

    void doFetch()
  }, [address, doFetch, paymentKey, state])

  useEffect(() => {
    if (state !== "confirming" || !pendingPaymentTxHash) return

    if (paymentReceipt?.status === "success" && address) {
      void doFetch(pendingPaymentTxHash, address, "verifying")
      return
    }

    if (paymentReceipt?.status === "reverted" || isReceiptError) {
      setFailedPaymentTxHash(pendingPaymentTxHash)
      setPendingPaymentTxHash(undefined)
      setError(getFriendlyError(receiptError?.message || "Payment transaction failed or reverted."))
      setState("error")
    }
  }, [address, doFetch, isReceiptError, paymentReceipt, pendingPaymentTxHash, receiptError, state])

  async function handlePay() {
    if (paymentConfigError) {
      setError(paymentConfigError)
      return
    }

    if (!isConnected || !address) {
      setError("Connect wallet to unlock")
      setState("error")
      return
    }

    setState("paying")
    setError(null)
    setFailedPaymentTxHash(undefined)

    try {
      const hash = await writeContractAsync({
        address: REPORT_PAYMENT_ADDRESS,
        abi: REPORT_PAYMENT_ABI,
        functionName: "purchaseReport",
        args: [stringToBytes32(leaderId)],
        value: parseUnits("1", 18),
        chainId: arcTestnet.id,
      })

      setPendingPaymentTxHash(hash)
      setState("confirming")
    } catch (caughtError) {
      setPendingPaymentTxHash(undefined)
      setError(getFriendlyError(caughtError instanceof Error ? caughtError.message : "Payment cancelled or failed"))
      setState("error")
    }
  }

  function retry() {
    setError(null)
    setState("idle")
  }

  function clearSavedPayment() {
    if (paymentKey) localStorage.removeItem(paymentKey)
    setPendingPaymentTxHash(undefined)
    setVerifiedPaymentTxHash(undefined)
    setFailedPaymentTxHash(undefined)
    setSavedPaymentTxHash(undefined)
    setReport(null)
    setError(null)
    setState("idle")
  }

  if (state === "loading" || state === "idle") {
    return <ReportShell message="Loading report status..." />
  }

  if (state === "paying") {
    return <ReportShell message="Confirm in wallet..." />
  }

  if (state === "confirming") {
    return <ReportShell message="Waiting for confirmation..." txHash={pendingPaymentTxHash} />
  }

  if (state === "verifying") {
    return <ReportShell message="Verifying payment..." txHash={pendingPaymentTxHash || savedPaymentTxHash} />
  }

  if (state === "error") {
    return (
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-semibold">Full Risk Report</h2>
        <p className="mt-3 whitespace-pre-line text-sm text-destructive">{error || "Unable to unlock report"}</p>
        {(failedPaymentTxHash || savedPaymentTxHash) && (
          <div className="mt-4 rounded-xl border bg-background p-4 text-sm">
            <p className="text-muted-foreground">Payment transaction</p>
            <a
              className="mt-1 block break-all font-mono text-primary underline"
              href={txUrl((failedPaymentTxHash || savedPaymentTxHash) as string)}
              target="_blank"
              rel="noreferrer"
            >
              {failedPaymentTxHash || savedPaymentTxHash}
            </a>
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={retry}>Retry</Button>
          {hasClearablePayment && (
            <Button variant="outline" onClick={clearSavedPayment}>
              Clear saved payment
            </Button>
          )}
        </div>
      </section>
    )
  }

  if (state === "unlocked" && report) {
    return <UnlockedReport report={report} paymentTxHash={verifiedPaymentTxHash || savedPaymentTxHash} />
  }

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Full Risk Report</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Unlock the full AI report with an x402-style on-chain payment.
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">Locked</span>
      </div>

      <div className="mt-5 grid gap-3 rounded-xl border bg-background p-4 text-sm">
        {paymentConfigError && <p className="text-destructive">{paymentConfigError}</p>}
        {error && <p className="text-destructive">{error}</p>}
        <PaywallField label="Price" value={paywallData?.priceHuman || paywallData?.price || "Unavailable"} />
        <PaywallField label="Recipient" value={paywallData?.recipient || "Missing"} />
        <PaywallField label="Chain ID" value={paywallData?.chainId ? String(paywallData.chainId) : "Missing"} />
        <PaywallField label="Contract" value={paywallData?.contractAddress || "Missing"} />
        {paywallData?.instructions && <p className="text-muted-foreground">{paywallData.instructions}</p>}
      </div>

      <Button
        className="mt-5 w-full"
        disabled={!isConnected || !address || Boolean(paymentConfigError)}
        onClick={handlePay}
      >
        {isConnected && address ? "Unlock Full Report - 1 USDC" : "Connect wallet to unlock"}
      </Button>
    </section>
  )
}

function ReportShell({ message, txHash }: { message: string; txHash?: string }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-xl font-semibold">Full Risk Report</h2>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      {txHash && (
        <a className="mt-3 block break-all text-sm text-primary underline" href={txUrl(txHash)} target="_blank" rel="noreferrer">
          {txHash}
        </a>
      )}
    </section>
  )
}

function UnlockedReport({ report, paymentTxHash }: { report: FullReport; paymentTxHash?: string }) {
  const reportHashShort = shortHash(report.reportHash)
  const paymentTxShort = paymentTxHash ? shortHash(paymentTxHash) : null

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Unlocked Report</p>
          <h2 className="mt-2 text-2xl font-semibold">Full Risk Report</h2>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", actionTone(report.action as "FOLLOW" | "REDUCE" | "EXIT"))}>
          {report.action}
        </span>
      </div>

      <div className="mt-5 rounded-xl border bg-background p-4">
        <p className="text-sm text-muted-foreground">Risk Score</p>
        <p className={cn("mt-1 inline-flex rounded-full border px-3 py-1 text-2xl font-bold", riskTone(report.riskScoreBps))}>
          {report.riskScoreBps} bps
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-current"
            style={{ width: `${Math.min(100, Math.max(0, report.riskScoreBps / 100))}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ReportField label="Leader ID" value={report.leaderId} />
        <ReportField label="Action" value={report.action} />
        <ReportField label="Confidence" value={`${report.confidenceBps} bps`} />
        <ReportField label="Recommended Allocation" value={`${report.recommendedAllocationBps} bps`} />
        <ReportField label="Degradation" value={report.degradationDetected ? "Detected" : "Not detected"} />
        {report.bondAction && <ReportField label="Bond Action" value={report.bondAction} />}
        {report.txHash && <ReportField label="Oracle Tx" value={shortHash(report.txHash)} />}
      </div>

      <div className="mt-4 rounded-xl border bg-background p-4">
        <p className="font-medium">Reasons</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {report.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <HashField label="Report Hash" shortValue={reportHashShort} fullValue={report.reportHash} />
        {paymentTxHash && (
          <div className="rounded-xl border bg-background p-4">
            <p className="text-muted-foreground">Payment Tx</p>
            <a className="mt-1 block break-all font-mono text-primary underline" href={txUrl(paymentTxHash)} target="_blank" rel="noreferrer">
              {paymentTxShort}
            </a>
          </div>
        )}
      </div>
    </section>
  )
}

function PaywallField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="break-all font-mono">{value}</span>
    </div>
  )
}

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-semibold">{value}</p>
    </div>
  )
}

function HashField({
  label,
  shortValue,
  fullValue,
}: {
  label: string
  shortValue: string
  fullValue: string
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono">{shortValue}</p>
      <code className="mt-2 block break-all rounded-lg bg-muted p-2 text-xs">{fullValue}</code>
    </div>
  )
}

function getPaymentConfigError(data: Report402Response | null) {
  if (!data) return null
  if (data.verificationError === "report payment contract is not configured") return BACKEND_CONFIG_ERROR
  if (!data.contractAddress || !data.recipient || !data.chainId || !data.price) {
    return INCOMPLETE_PAYMENT_CONFIG_ERROR
  }
  return null
}

function getFriendlyError(message: string) {
  if (message.toLowerCase().includes("report already purchased")) return DUPLICATE_PURCHASE_HINT
  if (message.toLowerCase().includes("reverted")) {
    return `Payment transaction failed or reverted.\n${DUPLICATE_PURCHASE_HINT}`
  }
  return message
}

function shortHash(value: string) {
  if (value.length <= 18) return value
  return `${value.slice(0, 10)}...${value.slice(-8)}`
}
