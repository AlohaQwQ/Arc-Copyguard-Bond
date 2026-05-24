"use client"

import { useQuery } from "@tanstack/react-query"
import { usePublicClient } from "wagmi"
import { arcTestnet } from "@/lib/arc"
import {
  BOND_VAULT_ADDRESS,
  BOND_VAULT_EVENTS,
  REPORT_PAYMENT_ADDRESS,
  REPORT_PAYMENT_EVENTS,
  RISK_ORACLE_ADAPTER_ADDRESS,
  RISK_ORACLE_EVENTS,
} from "@/lib/contracts"

export type EventCategory = "bonds" | "risk" | "reports"

export type DecodedEvent = {
  type: string
  contractLabel: "BondVault" | "ReportPayment" | "OracleAdapter"
  blockNumber: bigint
  logIndex?: number
  transactionHash: `0x${string}`
  args: Record<string, unknown>
  category: EventCategory
}

type EventsResult = {
  events: DecodedEvent[]
  partial: boolean
  warning: string | null
}

type ContractLogsResult = {
  logs: Array<{
    eventName?: string
    blockNumber?: bigint | null
    logIndex?: number | null
    transactionHash?: `0x${string}` | null
    args?: unknown
  }>
  partial: boolean
}

const DEFAULT_LOOKBACK_BLOCKS = BigInt(120000)
const RPC_BLOCK_RANGE_LIMIT = BigInt(9999)

export function useEvents() {
  const publicClient = usePublicClient({ chainId: arcTestnet.id })

  const query = useQuery({
    queryKey: ["copyguard-events", arcTestnet.id],
    queryFn: async () => {
      if (!publicClient) return { events: [], partial: false, warning: null }
      return fetchEvents(publicClient, DEFAULT_LOOKBACK_BLOCKS)
    },
    enabled: Boolean(publicClient),
    refetchInterval: 10000,
    placeholderData: (previousData) => previousData,
  })

  return {
    events: query.data?.events ?? [],
    partial: query.data?.partial ?? false,
    warning: query.data?.warning ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  }
}

async function fetchEvents(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  lookbackBlocks: bigint,
): Promise<EventsResult> {
  const latestBlock = await publicClient.getBlockNumber()
  const fromBlock = latestBlock > lookbackBlocks ? latestBlock - lookbackBlocks : BigInt(0)
  const toBlock = latestBlock

  const [bondLogs, reportLogs, oracleLogs] = await Promise.all([
    BOND_VAULT_ADDRESS
      ? getContractEventsInChunks(publicClient, BOND_VAULT_ADDRESS, BOND_VAULT_EVENTS, fromBlock, toBlock)
      : emptyContractLogs(),
    REPORT_PAYMENT_ADDRESS
      ? getContractEventsInChunks(publicClient, REPORT_PAYMENT_ADDRESS, REPORT_PAYMENT_EVENTS, fromBlock, toBlock)
      : emptyContractLogs(),
    RISK_ORACLE_ADAPTER_ADDRESS
      ? getContractEventsInChunks(publicClient, RISK_ORACLE_ADAPTER_ADDRESS, RISK_ORACLE_EVENTS, fromBlock, toBlock)
      : emptyContractLogs(),
  ])

  const events = [
    ...bondLogs.logs.map((log) => normalizeEvent(log, "BondVault")),
    ...reportLogs.logs.map((log) => normalizeEvent(log, "ReportPayment")),
    ...oracleLogs.logs.map((log) => normalizeEvent(log, "OracleAdapter")),
  ]
    .filter((event): event is DecodedEvent => Boolean(event))
    .filter((event, index, allEvents) => allEvents.findIndex((candidate) => eventKey(candidate) === eventKey(event)) === index)
    .sort((a, b) => {
      if (a.blockNumber === b.blockNumber) return 0
      return a.blockNumber > b.blockNumber ? -1 : 1
    })

  const partial = bondLogs.partial || reportLogs.partial || oracleLogs.partial
  return {
    events,
    partial,
    warning: partial ? "Some event ranges could not be loaded from Arc RPC. Showing partial results." : null,
  }
}

function emptyContractLogs(): ContractLogsResult {
  return { logs: [], partial: false }
}

async function getContractEventsInChunks(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  address: `0x${string}`,
  abi: typeof BOND_VAULT_EVENTS | typeof REPORT_PAYMENT_EVENTS | typeof RISK_ORACLE_EVENTS,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<ContractLogsResult> {
  const logs = []
  let partial = false
  let chunkFrom = fromBlock

  while (chunkFrom <= toBlock) {
    const chunkTo = chunkFrom + RPC_BLOCK_RANGE_LIMIT > toBlock ? toBlock : chunkFrom + RPC_BLOCK_RANGE_LIMIT
    try {
      const chunkLogs = await publicClient.getContractEvents({
        address,
        abi,
        fromBlock: chunkFrom,
        toBlock: chunkTo,
      })

      logs.push(...chunkLogs)
    } catch {
      partial = true
    }
    chunkFrom = chunkTo + BigInt(1)
  }

  return { logs, partial }
}

function normalizeEvent(
  log: {
    eventName?: string
    blockNumber?: bigint | null
    logIndex?: number | null
    transactionHash?: `0x${string}` | null
    args?: unknown
  },
  contractLabel: DecodedEvent["contractLabel"],
): DecodedEvent | null {
  if (!log.eventName || !log.blockNumber || !log.transactionHash) return null

  return {
    type: log.eventName,
    contractLabel,
    blockNumber: log.blockNumber,
    logIndex: log.logIndex ?? undefined,
    transactionHash: log.transactionHash,
    args: normalizeArgs(log.args),
    category: getCategory(log.eventName),
  }
}

function normalizeArgs(args: unknown): Record<string, unknown> {
  if (!args || typeof args !== "object") return {}
  return { ...(args as Record<string, unknown>) }
}

function getCategory(eventName: string): EventCategory {
  if (eventName === "ReportPurchased") return "reports"
  if (eventName === "RiskUpdated" || eventName === "BondWarned" || eventName === "RiskUpdateForwarded") {
    return "risk"
  }
  return "bonds"
}

function eventKey(event: DecodedEvent) {
  return `${event.transactionHash}-${event.logIndex ?? event.type}`
}
