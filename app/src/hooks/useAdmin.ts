import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import type { Abi } from 'viem'
import { LEGACYPRIME_ADMIN_ABI } from '../abis/legacyPrimeAdmin'
import { useContracts } from './useLegacyPrime'

const ADMIN_ABI = LEGACYPRIME_ADMIN_ABI as Abi // pass as generic Abi to avoid deep multicall inference

/** Is the connected wallet the contract owner (and/or an admin)? Gates the admin page + nav link. */
export function useIsAdmin() {
  const { address } = useAccount()
  const { plan } = useContracts()
  const ready = !!address && !!plan

  const { data, refetch } = useReadContracts({
    contracts: ready
      ? [
          { address: plan, abi: ADMIN_ABI, functionName: 'owner' },
          { address: plan, abi: ADMIN_ABI, functionName: 'checkIsAdmin', args: [address] },
        ]
      : [],
    query: { enabled: ready, refetchInterval: 30_000 },
  })

  const owner = data?.[0]?.result as `0x${string}` | undefined
  const isAdmin = (data?.[1]?.result as boolean | undefined) ?? false
  const isOwner = !!owner && !!address && owner.toLowerCase() === address.toLowerCase()

  return { owner, isAdmin, isOwner, isLoading: ready && !data, refetch }
}

/** One-shot snapshot of every admin-relevant param + pool balance for the status panel. */
export function useAdminData() {
  const { plan } = useContracts()
  const ready = !!plan
  const read = (functionName: string) => ({ address: plan as `0x${string}`, abi: ADMIN_ABI, functionName })

  const { data, refetch } = useReadContracts({
    contracts: ready
      ? [
          read('paused'),
          read('treasury'),
          read('incentiveBalance'),
          read('liquidityBalance'),
          read('productBalance'),
          read('profitBalance'),
          read('collectedFees'),
          read('lpntReserve'),
          read('systemFee'),
          read('systemWallet'),
          read('withdrawFeeBps'),
          read('minWithdraw'),
          read('withdrawCooldown'),
          read('cashBackClaimBps'),
          read('capBps'),
          read('productRate'),
          read('liquidity'),
          read('liquiditySlippageBps'),
          read('owner'),
        ]
      : [],
    query: { enabled: ready, refetchInterval: 20_000 },
  })

  const g = <T,>(i: number) => data?.[i]?.result as T | undefined
  return {
    refetch,
    paused: g<boolean>(0),
    treasury: g<bigint>(1),
    incentiveBalance: g<bigint>(2),
    liquidityBalance: g<bigint>(3),
    productBalance: g<bigint>(4),
    profitBalance: g<bigint>(5),
    collectedFees: g<bigint>(6),
    lpntReserve: g<bigint>(7),
    systemFee: g<bigint>(8),
    systemWallet: g<`0x${string}`>(9),
    withdrawFeeBps: g<bigint>(10),
    minWithdraw: g<bigint>(11),
    withdrawCooldown: g<bigint>(12),
    cashBackClaimBps: g<bigint>(13),
    capBps: g<bigint>(14),
    productRate: g<bigint>(15),
    liquidity: g<`0x${string}`>(16),
    liquiditySlippageBps: g<bigint>(17),
    owner: g<`0x${string}`>(18),
  }
}

/** Read the current pause state on its own (for the pause toggle). */
export function usePaused() {
  const { plan } = useContracts()
  const { data, refetch } = useReadContract({
    address: plan,
    abi: ADMIN_ABI,
    functionName: 'paused',
    query: { enabled: !!plan },
  })
  return { paused: data as boolean | undefined, refetch }
}
