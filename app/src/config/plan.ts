// LegacyPrime compensation plan — mirrors contracts/legacyprime.sol.
// Three entry tiers (70 / 100 / 200 USDT); activate(amount) must match one. All eight
// allocations + the earnings cap scale with the chosen tier. The split (percent of entry)
// is fixed and sums to 100%. Four allocations are "capped" income — they draw the earner's
// cappingBalance (4× the tier) down; when it hits 0 the account rests until re-activation.

export const TIERS = [70, 100, 200] as const
export type Tier = (typeof TIERS)[number]

export const CAP_MULTIPLE = 4          // cappingBalance top-up = 4× the entry (capBps 40000)
export const REFERRAL_PCT = 0.1        // 10% of the activator's entry → direct sponsor
export const CASHBACK_PCT = 0.1        // 10% of the activator's entry → sponsor cashBack
export const CASHBACK_CLAIM_PCT = 0.2  // each claimCashBack = 20% of YOUR active tier
export const GENERATION_PCT = 0.01     // 1% of the activator's entry per one-line level
export const GENERATION_LEVELS = 10    // levels paid up the global one-line
export const LEADERS_MATCH = 1         // 100% match of a direct's Generation (leadersMatchBps 10000)

export type Allocation = {
  key: string
  name: string
  pct: number       // % of the entry (fixed across tiers)
  sub?: string
  earner: string
  capped: boolean
  blurb: string
}

export const ALLOCATIONS: Allocation[] = [
  {
    key: 'referral', name: 'Referral', pct: 10, earner: 'Your direct sponsor', capped: true,
    blurb: 'Your sponsor earns 10% of your entry the moment you activate — on every activation, including your re-activations.',
  },
  {
    key: 'generation', name: 'Generation', pct: 10, sub: '1% × 10 levels', earner: '10 uplines on the global one-line', capped: true,
    blurb: '1% to each of the 10 nearest ACTIVE members above you on the global one-line. Auto-compresses past inactive members so all 10 shares reach active earners.',
  },
  {
    key: 'leaders', name: 'Leaders (match)', pct: 10, earner: "One-line earners' sponsors", capped: true,
    blurb: 'A 100% match — when a one-line member earns Generation, their own direct sponsor earns the same amount. Rewards you for sponsoring active leaders.',
  },
  {
    key: 'cashback', name: 'Cashback', pct: 10, earner: 'Your direct sponsor', capped: true,
    blurb: 'Your sponsor accrues 10% of your entry as cashback per direct activation, claimable in chunks of 20% of their own active tier.',
  },
  {
    key: 'incentive', name: 'Incentive', pct: 20, earner: 'Community pool', capped: false,
    blurb: 'Funds the incentive pool used for promotions, contests, and community rewards.',
  },
  {
    key: 'product', name: 'Product', pct: 20, earner: 'You — in LPNT', capped: false,
    blurb: 'You receive LPN TOKEN (LPNT): from the reserve when stocked, otherwise market-swapped from the USDT/LPNT pool — your product allocation toward redemptions.',
  },
  {
    key: 'liquidity', name: 'Token liquidity', pct: 10, earner: 'USDT / LPNT pool', capped: false,
    blurb: 'Routed into the USDT/LPNT liquidity pool, deepening the token market.',
  },
  {
    key: 'profit', name: 'Profit', pct: 10, earner: 'Protocol', capped: false,
    blurb: 'Protocol revenue — plus any capped overflow and unfilled shares, so value is never created from nothing.',
  },
]
