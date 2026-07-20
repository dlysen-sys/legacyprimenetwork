import { useCallback, useEffect, useState } from 'react'
import { usePublicClient } from 'wagmi'
import { LEGACYPRIME_ABI } from '../abis/legacyPrime'
import { useContracts, type NodeSummary } from './useLegacyPrime'

const ZERO = '0x0000000000000000000000000000000000000000'
const MAX_NODES = 500 // safety cap on the walk

export type OneLineRow = { address: `0x${string}`; summary: NodeSummary }

// Your one-line: start at `start` (the connected wallet) and follow each member's `line` predecessor up
// to root (root.line == 0). Loads the whole chain ONCE, then paginates client-side (pageSize/page) — no
// per-page refetch, so it can't duplicate. A `seen` set makes the walk cycle-proof. Results are REPLACED
// (never appended), so React StrictMode's double-invoke can't double-list your wallet.
export function useOneLine(start?: `0x${string}`, pageSize = 10) {
  const client = usePublicClient()
  const { plan } = useContracts()

  const [rows, setRows] = useState<OneLineRow[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [nonce, setNonce] = useState(0) // bump to force a reload

  useEffect(() => {
    if (!client || !plan || !start || start === ZERO) {
      setRows([])
      return
    }
    let cancelled = false
    setLoading(true)
    setPage(0)

    ;(async () => {
      const read = (functionName: string, args?: readonly unknown[]) =>
        client.readContract({ address: plan, abi: LEGACYPRIME_ABI, functionName, args } as Parameters<
          typeof client.readContract
        >[0])

      // 1) walk the `line` chain from `start` up to root, collecting addresses (cycle-proof).
      const seen = new Set<string>()
      const addrs: `0x${string}`[] = []
      let cur: `0x${string}` = start
      while (cur && cur !== ZERO && !seen.has(cur.toLowerCase()) && addrs.length < MAX_NODES) {
        seen.add(cur.toLowerCase())
        addrs.push(cur)
        const aff = (await read('getAffiliate', [cur])) as readonly [string, string, bigint]
        cur = aff[1] as `0x${string}` // .line (one-line predecessor)
      }

      // 2) fetch each member's summary.
      const users = await Promise.all(addrs.map((a) => read('getUser', [a])))
      if (cancelled) return

      setRows(
        addrs.map((a, i) => {
          const u = users[i] as { active: boolean; activePackage: bigint; directCount: bigint }
          return {
            address: a,
            summary: { active: u.active, activePackage: u.activePackage, directCount: u.directCount },
          }
        }),
      )
      setLoading(false)
    })().catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [client, plan, start, nonce])

  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(page, pageCount - 1)
  const pageRows = rows.slice(current * pageSize, current * pageSize + pageSize)

  const next = useCallback(() => setPage((p) => Math.min(pageCount - 1, p + 1)), [pageCount])
  const prev = useCallback(() => setPage((p) => Math.max(0, p - 1)), [])
  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  return {
    pageRows,
    page: current,
    pageCount,
    pageSize,
    total,
    hasPrev: current > 0,
    hasNext: current < pageCount - 1,
    next,
    prev,
    loading,
    refresh,
  }
}
