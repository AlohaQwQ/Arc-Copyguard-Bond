export const BOND_VAULT_ADDRESS =
  (process.env.NEXT_PUBLIC_BOND_VAULT_ADDRESS || "0x822bBEF75F14744d11BaC553997Bd908dBE49B47") as `0x${string}`

export const REPORT_PAYMENT_ADDRESS =
  (process.env.NEXT_PUBLIC_REPORT_PAYMENT_ADDRESS || "0x15832FA84424E257ACf3735e905E9a5d3B33ee82") as `0x${string}`

export const LEADER_REGISTRY_ADDRESS =
  (process.env.NEXT_PUBLIC_LEADER_REGISTRY_ADDRESS || "0x3bF132F0dc8e4528f7E223eF07A7cD5F004Be967") as `0x${string}`

export const RISK_ORACLE_ADAPTER_ADDRESS =
  (process.env.NEXT_PUBLIC_RISK_ORACLE_ADAPTER_ADDRESS || "0x63109ECE16d78A5cEc5499F7f154e107549f7965") as `0x${string}`

export const BOND_VAULT_ABI = [
  {
    type: "function",
    name: "createBond",
    stateMutability: "payable",
    inputs: [
      { name: "leaderId", type: "bytes32" },
      { name: "riskThresholdBps", type: "uint16" },
      { name: "expiry", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "nextBondId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "bonds",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "follower", type: "address" },
      { name: "leaderId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "createdAt", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "riskThresholdBps", type: "uint16" },
      { name: "lastRiskScoreBps", type: "uint16" },
      { name: "lastReportHash", type: "bytes32" },
      { name: "state", type: "uint8" },
    ],
  },
] as const

export const REPORT_PAYMENT_ABI = [
  {
    type: "function",
    name: "purchaseReport",
    stateMutability: "payable",
    inputs: [{ name: "leaderId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "hasPurchased",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "leaderId", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const

export function stringToBytes32(str: string): `0x${string}` {
  const bytes = new TextEncoder().encode(str)

  if (bytes.length > 32) {
    throw new Error("String is too long for bytes32")
  }

  const padded = new Uint8Array(32)
  padded.set(bytes)

  const hex = Array.from(padded)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")

  return `0x${hex}` as `0x${string}`
}

export const BOND_VAULT_EVENTS = [
  {
    type: "event",
    name: "BondCreated",
    inputs: [
      { name: "bondId", type: "uint256", indexed: true },
      { name: "follower", type: "address", indexed: true },
      { name: "leaderId", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RiskUpdated",
    inputs: [
      { name: "bondId", type: "uint256", indexed: true },
      { name: "riskScoreBps", type: "uint16", indexed: false },
      { name: "reportHash", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BondWarned",
    inputs: [
      { name: "bondId", type: "uint256", indexed: true },
      { name: "riskScoreBps", type: "uint16", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BondSlashed",
    inputs: [
      { name: "bondId", type: "uint256", indexed: true },
      { name: "slashedAmount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BondRefunded",
    inputs: [
      { name: "bondId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BondSettled",
    inputs: [
      { name: "bondId", type: "uint256", indexed: true },
    ],
  },
] as const

export const REPORT_PAYMENT_EVENTS = [
  {
    type: "event",
    name: "ReportPurchased",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "leaderId", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const

export const RISK_ORACLE_EVENTS = [
  {
    type: "event",
    name: "RiskUpdateForwarded",
    inputs: [
      { name: "bondId", type: "uint256", indexed: true },
      { name: "riskScoreBps", type: "uint16", indexed: false },
      { name: "reportHash", type: "bytes32", indexed: false },
      { name: "oracle", type: "address", indexed: true },
    ],
  },
] as const
