import { useAccount, useChainId, useReadContract, useReadContracts } from 'wagmi'
import { LEGACYPRIME_ABI } from '../abis/legacyPrime'
import { ERC20_ABI } from '../abis/erc20'
import { contractsFor } from '../config/contracts'
import { useCooldown } from './useCooldown'

// Decoded getUser() snapshot (UserView). All USDT fields are 18dp bigints.
export type Member = {
  registered: boolean
  active: boolean
  sponsor: `0x${string}`
  line: `0x${string}`
  directCount: bigint
  activationCount: bigint
  walletBalance: bigint
  activePackage: bigint
  cappingBalance: bigint
  earningsCap: bigint
  cashBackAvailable: bigint
  referralBalance: bigint
  generationBalance: bigint
  leadersBalance: bigint
}

/** Resolved contract addresses + config for the connected chain. */
export function useContracts() {
  const chainId = useChainId()
  return contractsFor(chainId)
}

/** getUser snapshot for the connected wallet — one call powers the whole dashboard. */
export function useMember() {
  const { address } = useAccount()
  const { plan, configured } = useContracts()

  const query = useReadContract({
    address: plan,
    abi: LEGACYPRIME_ABI,
    functionName: 'getUser',
    args: address ? [address] : undefined,
    query: { enabled: !!address && configured, refetchInterval: 15_000 },
  })

  return { member: query.data, isLoading: query.isLoading, refetch: query.refetch, configured }
}

/** USDT balance + current allowance to the plan (for the approve→deposit flow). */
export function useUsdt() {
  const { address } = useAccount()
  const { plan, usdt } = useContracts()
  const ready = !!address && !!usdt && !!plan

  const { data, refetch } = useReadContracts({
    contracts: ready
      ? [
          { address: usdt, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] },
          { address: usdt, abi: ERC20_ABI, functionName: 'allowance', args: [address, plan] },
        ]
      : [],
    query: { enabled: ready, refetchInterval: 15_000 },
  })

  return {
    balance: data?.[0]?.result as bigint | undefined,
    allowance: data?.[1]?.result as bigint | undefined,
    refetch,
  }
}

// Compact per-node summary for the genealogy tree.
export type NodeSummary = { active: boolean; activePackage: bigint; directCount: bigint }

const GENEALOGY_PAGE = 100n // children fetched per node (rest shown as "+N more")

/** Lazy-load one genealogy node's direct children + each child's summary (active/tier/directCount).
 *  Only fires when `enabled` (i.e. the node is expanded). One getChildren read + one batched getUser. */
export function useGenealogyChildren(address?: `0x${string}`, enabled = true) {
  const { plan } = useContracts()
  const on = !!plan && !!address && enabled

  const childrenQ = useReadContract({
    address: plan,
    abi: LEGACYPRIME_ABI,
    functionName: 'getChildren',
    args: address ? [address, 0n, GENEALOGY_PAGE] : undefined,
    query: { enabled: on },
  })

  const kids = (childrenQ.data?.[0] as readonly `0x${string}`[] | undefined) ?? []
  const total = (childrenQ.data?.[1] as bigint | undefined) ?? 0n

  const summariesQ = useReadContracts({
    contracts: kids.map((k) => ({
      address: plan as `0x${string}`,
      abi: LEGACYPRIME_ABI,
      functionName: 'getUser',
      args: [k],
    })),
    query: { enabled: on && kids.length > 0 },
  })

  const nodes = kids.map((addr, i) => {
    const u = summariesQ.data?.[i]?.result as Member | undefined
    const summary: NodeSummary | undefined = u
      ? { active: u.active, activePackage: u.activePackage, directCount: u.directCount }
      : undefined
    return { address: addr, summary }
  })

  return {
    nodes,
    total,
    isLoading: childrenQ.isLoading || summariesQ.isLoading,
    refetch: () => {
      childrenQ.refetch()
      summariesQ.refetch()
    },
  }
}

/** Your accrued Product allocation (tokenBalance, USDT-denominated) + the current productRate, so a
 *  claim card can show the LPNT you'd receive (= tokenBalance × productRate / 1e18). */
export function useTokenBalance() {
  const { address } = useAccount()
  const { plan } = useContracts()
  const ready = !!address && !!plan

  const { data, refetch } = useReadContracts({
    contracts: ready
      ? [
          { address: plan, abi: LEGACYPRIME_ABI, functionName: 'tokenBalance', args: [address] },
          { address: plan, abi: LEGACYPRIME_ABI, functionName: 'productRate' },
        ]
      : [],
    query: { enabled: ready, refetchInterval: 15_000 },
  })

  return {
    tokenBalance: data?.[0]?.result as bigint | undefined,
    productRate: data?.[1]?.result as bigint | undefined,
    refetch,
  }
}

/** Anti-spam gate: reads lastCallTime[you] + transactionCooldown into a live countdown. All the
 *  plan's user calls share it (9s default), so pass this to every plan write button. */
export function useTxCooldown() {
  const { address } = useAccount()
  const { plan } = useContracts()

  const { data, refetch } = useReadContracts({
    contracts:
      address && plan
        ? [
            { address: plan, abi: LEGACYPRIME_ABI, functionName: 'lastCallTime', args: [address] },
            { address: plan, abi: LEGACYPRIME_ABI, functionName: 'transactionCooldown' },
          ]
        : [],
    query: { enabled: !!address && !!plan },
  })

  const cd = useCooldown(data?.[0]?.result as bigint | undefined, data?.[1]?.result as bigint | undefined)
  return { ...cd, refetch }
}

/** 24h withdraw cooldown: lastWithdraw[you] + withdrawCooldown into a live countdown. */
export function useWithdrawCooldown() {
  const { address } = useAccount()
  const { plan } = useContracts()

  const { data, refetch } = useReadContracts({
    contracts:
      address && plan
        ? [
            { address: plan, abi: LEGACYPRIME_ABI, functionName: 'lastWithdraw', args: [address] },
            { address: plan, abi: LEGACYPRIME_ABI, functionName: 'withdrawCooldown' },
          ]
        : [],
    query: { enabled: !!address && !!plan },
  })

  const cd = useCooldown(data?.[0]?.result as bigint | undefined, data?.[1]?.result as bigint | undefined)
  return { ...cd, refetch }
}
