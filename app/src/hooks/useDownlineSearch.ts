import { useCallback, useState } from 'react'
import { usePublicClient } from 'wagmi'
import { isAddress } from 'viem'
import { LEGACYPRIME_ABI } from '../abis/legacyPrime'
import { useContracts, type NodeSummary } from './useLegacyPrime'

const ZERO = '0x0000000000000000000000000000000000000000'
const MAX_HOPS = 500 // safety cap on the upward walk

export type SearchResult =
  | { found: true; address: `0x${string}`; depth: number; summary: NodeSummary }
  | { found: false; reason: string }

// Downline-only member search. Given a wallet address, confirm it sits in YOUR downline by walking its
// `referral` parents UP until we reach you (the connected root) — O(depth) reads. This structurally
// can't reveal your uplines: it only ever returns members whose ancestry passes through you. `depth` is
// how many levels below you the member is (1 = a direct referral).
export function useDownlineSearch(root?: `0x${string}`) {
  const client = usePublicClient()
  const { plan } = useContracts()
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)

  const search = useCallback(
    async (input: string) => {
      const q = input.trim()
      if (!q) {
        setResult(null)
        return
      }
      if (!isAddress(q)) {
        setResult({ found: false, reason: 'Enter a valid 0x wallet address.' })
        return
      }
      if (!client || !plan || !root) return
      if (q.toLowerCase() === root.toLowerCase()) {
        setResult({ found: false, reason: "That's your own wallet." })
        return
      }

      setLoading(true)
      try {
        const read = (functionName: string, args?: readonly unknown[]) =>
          client.readContract({ address: plan, abi: LEGACYPRIME_ABI, functionName, args } as Parameters<
            typeof client.readContract
          >[0])

        const isMember = (await read('isUser', [q])) as boolean
        if (!isMember) {
          setResult({ found: false, reason: 'Not a registered member.' })
          return
        }

        // Walk referral parents up to the connected root.
        let cur = q as `0x${string}`
        let depth = 0
        let found = false
        while (cur && cur !== ZERO && depth < MAX_HOPS) {
          const aff = (await read('getAffiliate', [cur])) as readonly [string, string, bigint]
          const referral = aff[0] as `0x${string}` // sponsor (parent in the referral tree)
          depth++
          if (referral.toLowerCase() === root.toLowerCase()) {
            found = true
            break
          }
          if (referral === ZERO) break
          cur = referral
        }

        if (!found) {
          setResult({ found: false, reason: 'Not in your downline.' })
          return
        }

        const u = (await read('getUser', [q])) as {
          active: boolean
          activePackage: bigint
          directCount: bigint
        }
        setResult({
          found: true,
          address: q as `0x${string}`,
          depth,
          summary: { active: u.active, activePackage: u.activePackage, directCount: u.directCount },
        })
      } finally {
        setLoading(false)
      }
    },
    [client, plan, root],
  )

  const clear = useCallback(() => setResult(null), [])

  return { result, loading, search, clear }
}
