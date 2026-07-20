// Contract addresses + chain config (contract-integration SOP, Step 3). Addresses are keyed by network so
// the same build works on BSC mainnet / testnet / local anvil. The LegacyPrime plan address comes from env
// (VITE_LEGACYPRIME_ADDRESS) because it is deployed per-environment; USDT + LPNT are the fixed BSC tokens the
// plan hardcodes. Never inline an address in a component — import from here.
import { bsc } from 'viem/chains'

type Address = `0x${string}`

const env = import.meta.env

// LegacyPrime plan — BSC mainnet is baked in (deployed 2026-07-20); env vars still override per chain.
const PLAN_BSC = '0x4ba9ABC310b8601A4c245948f27341b3e704c59C'
const PLAN_BY_CHAIN: Record<number, string | undefined> = {
  56: env.VITE_LEGACYPRIME_ADDRESS_BSC ?? env.VITE_LEGACYPRIME_ADDRESS ?? PLAN_BSC,
  97: env.VITE_LEGACYPRIME_ADDRESS_TESTNET ?? env.VITE_LEGACYPRIME_ADDRESS,
  31337: env.VITE_LEGACYPRIME_ADDRESS_LOCAL ?? env.VITE_LEGACYPRIME_ADDRESS,
}

// LegacyPrimeLiquidity — the USDT/LPNT V3 LP manager the plan routes its Liquidity allocation to.
// Wire it on-chain with plan.setLiquidity(...) (admin); exported here for the admin UI + reference.
export const LIQUIDITY_MANAGER_BSC = '0x28d0851d7eF8b06c75c3B8b8a95989708988e099' as Address
// The live USDT/LPNT PancakeSwap V3 pool (1% fee) backing the manager's position.
export const USDT_LPNT_POOL_BSC = '0xB940A92bAd2Ae7E86203a56d94Ad0E84c88E26a6' as Address

// USDT (BEP20, 18 decimals) — the entry-package token. The plan hardcodes this address, so local
// (anvil) reuses the same one — deploy-local.sh installs a mock ERC-20 there via anvil_setCode.
const HARDCODED_USDT = '0x55d398326f99059fF775485246999027B3197955'
const USDT_BY_CHAIN: Record<number, string | undefined> = {
  56: env.VITE_USDT_ADDRESS ?? HARDCODED_USDT,
  97: env.VITE_USDT_ADDRESS_TESTNET ?? env.VITE_USDT_ADDRESS,
  31337: env.VITE_USDT_ADDRESS_LOCAL ?? HARDCODED_USDT,
}

// LPN TOKEN (LPNT) — the Product-allocation token, and the swap target.
export const LPNT_ADDRESS = (env.VITE_LPNT_ADDRESS ??
  '0x22456a4cc697aace2849280230Ab58266b54c999') as Address

// USDT is 18 decimals on BSC (unlike 6-decimal USDC) — the whole plan is denominated in 18dp USDT.
export const USDT_DECIMALS = 18

const EXPLORER_BY_CHAIN: Record<number, string> = {
  56: 'https://bscscan.com',
  97: 'https://testnet.bscscan.com',
  31337: '',
}

// The default network the app expects (matches lib/appkit → BSC mainnet).
export const DEFAULT_CHAIN_ID = bsc.id // 56
export const SUPPORTED_CHAIN_IDS = [56, 97, 31337] as const

const isAddress = (v?: string): v is Address => !!v && /^0x[a-fA-F0-9]{40}$/.test(v)

/** Resolve all addresses + explorer for a given chain (falls back to the default chain). */
export function contractsFor(chainId?: number) {
  const id = chainId && SUPPORTED_CHAIN_IDS.includes(chainId as 56) ? chainId : DEFAULT_CHAIN_ID
  const plan = PLAN_BY_CHAIN[id]
  const usdt = USDT_BY_CHAIN[id]
  return {
    chainId: id,
    plan: isAddress(plan) ? plan : undefined,
    usdt: isAddress(usdt) ? usdt : undefined,
    lpnt: LPNT_ADDRESS,
    explorer: EXPLORER_BY_CHAIN[id] ?? '',
    /** True only when the plan address is set for this chain — gates all reads/writes. */
    configured: isAddress(plan),
  }
}

// Swap-token link (Product/utility). Ready now; swap-in-app can replace this later. Defaults to a
// PancakeSwap swap deep-link prefilled USDT → LPNT. Override the whole URL with VITE_SWAP_URL.
export const SWAP_URL =
  (env.VITE_SWAP_URL as string | undefined) ??
  `https://pancakeswap.finance/swap?inputCurrency=${USDT_BY_CHAIN[56]}&outputCurrency=${LPNT_ADDRESS}`
