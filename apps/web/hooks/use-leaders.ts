"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchJson, type Leader, type LeaderDetail, type RiskSummary } from "@/lib/api"

export function useLeaders() {
  return useQuery({
    queryKey: ["leaders"],
    queryFn: () => fetchJson<Leader[]>("/api/leaders"),
  })
}

export function useLeader(id: string) {
  return useQuery({
    queryKey: ["leader", id],
    queryFn: () => fetchJson<LeaderDetail>(`/api/leaders/${id}`),
    enabled: Boolean(id),
  })
}

export function useRisk(id: string) {
  return useQuery({
    queryKey: ["risk", id],
    queryFn: () => fetchJson<RiskSummary>(`/api/risk/${id}`),
    enabled: Boolean(id),
  })
}
