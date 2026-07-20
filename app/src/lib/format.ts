import { formatUnits } from 'viem'
import { USDT_DECIMALS } from '../config/contracts'

// Outbound conversion (Contract → Display): every USDT value the plan returns is an 18dp bigint.
// Always route it through here before rendering — never show a raw bigint.
export function fmtUsdt(v?: bigint, dp = 2): string {
  if (v === undefined) return '—'
  const n = Number(formatUnits(v, USDT_DECIMALS))
  return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })
}

/** Human number (no grouping) for compact reads, e.g. tier "70". */
export function toNum(v?: bigint): number {
  return v === undefined ? 0 : Number(formatUnits(v, USDT_DECIMALS))
}

export const shortAddr = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '')
