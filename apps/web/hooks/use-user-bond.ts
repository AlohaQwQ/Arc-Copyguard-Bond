"use client"

import { useMemo } from "react"
import { useAppKitAccount } from "@reown/appkit/react"
import { useReadContract, useReadContracts } from "wagmi"
import { arcTestnet } from "@/lib/arc"
import { BOND_VAULT_ABI, BOND_VAULT_ADDRESS, stringToBytes32 } from "@/lib/contracts"

export type BondTuple = readonly [
  bigint,
  `0x${string}`,
  `0x${string}`,
  bigint,
  bigint,
  bigint,
  number,
  number,
  `0x${string}`,
  number,
]

export type BondData = {
  id: bigint
  follower: `0x${string}`
  leaderId: `0x${string}`
  amount: bigint
  createdAt: bigint
  expiry: bigint
  riskThresholdBps: number
  lastRiskScoreBps: number
  lastReportHash: `0x${string}`
  state: number
}

function normalizeBond(tuple: BondTuple): BondData {
  return {
    id: tuple[0],
    follower: tuple[1],
    leaderId: tuple[2],
    amount: tuple[3],
    createdAt: tuple[4],
    expiry: tuple[5],
    riskThresholdBps: tuple[6],
    lastRiskScoreBps: tuple[7],
    lastReportHash: tuple[8],
    state: tuple[9],
  }
}

export function useUserBond(leaderId: string) {
  const { address, isConnected } = useAppKitAccount()

  const {
    data: nextBondId,
    isError: isNextBondIdError,
    isLoading: isNextBondIdLoading,
    refetch: refetchNextBondId,
  } = useReadContract({
    address: BOND_VAULT_ADDRESS,
    abi: BOND_VAULT_ABI,
    functionName: "nextBondId",
    chainId: arcTestnet.id,
    query: {
      enabled: isConnected && Boolean(address),
      refetchInterval: isConnected ? 5000 : false,
    },
  })

  const bondIds = useMemo(() => {
    const latestBondId = nextBondId ? Number(nextBondId) - 1 : 0
    const startBondId = Math.max(1, latestBondId - 99)

    if (latestBondId < 1) return []

    return Array.from({ length: latestBondId - startBondId + 1 }, (_, index) => startBondId + index)
  }, [nextBondId])

  const targetLeaderId = useMemo(() => {
    if (!leaderId) return null

    try {
      return stringToBytes32(leaderId).toLowerCase()
    } catch {
      return null
    }
  }, [leaderId])

  const {
    data: bondResults,
    isLoading: isBondsLoading,
    isError: isBondsError,
    refetch: refetchBonds,
  } = useReadContracts({
    contracts: bondIds.map((bondId) => ({
      address: BOND_VAULT_ADDRESS,
      abi: BOND_VAULT_ABI,
      functionName: "bonds",
      args: [BigInt(bondId)],
      chainId: arcTestnet.id,
    })),
    query: {
      enabled: isConnected && Boolean(address) && Boolean(targetLeaderId) && bondIds.length > 0,
      refetchInterval: isConnected && bondIds.length > 0 ? 5000 : false,
    },
  })

  const bond = useMemo(() => {
    if (!address || !targetLeaderId || !bondResults) return null

    const matchedBonds = bondResults
      .filter((result) => result.status === "success" && result.result !== undefined)
      .map((result) => normalizeBond(result.result as unknown as BondTuple))
      .filter(
        (candidate) =>
          candidate.follower.toLowerCase() === address.toLowerCase() &&
          candidate.leaderId.toLowerCase() === targetLeaderId,
      )
      .sort((a, b) => Number(b.id - a.id))

    return matchedBonds[0] ?? null
  }, [address, bondResults, targetLeaderId])

  const refetch = () => {
    void refetchNextBondId()
    void refetchBonds()
  }

  const isReadError = isNextBondIdError || isBondsError || !targetLeaderId

  return {
    bond: isReadError ? null : bond,
    isConnected: Boolean(isConnected && address),
    isLoading: isConnected && !isReadError ? isNextBondIdLoading || isBondsLoading : false,
    error: isReadError ? "Unable to load bond status" : null,
    refetch,
  }
}
