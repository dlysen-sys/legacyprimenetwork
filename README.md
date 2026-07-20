# LegacyPrime Network

A tiered affiliate/compensation protocol on **BNB Smart Chain**, settled entirely in USDT (BEP-20, 18 dp),
with an on-chain referral tree, a global one-line, and an 8-way distribution of every entry package.

🌐 **[legacyprimenetwork.com](https://legacyprimenetwork.com)**

---

## Deployed contracts (BSC mainnet, chain 56)

| Contract | Address |
|---|---|
| **LegacyPrime** (plan) | [`0x4ba9ABC310b8601A4c245948f27341b3e704c59C`](https://bscscan.com/address/0x4ba9ABC310b8601A4c245948f27341b3e704c59C) |
| **LegacyPrimeLiquidity** (USDT/LPNT LP manager) | [`0x28d0851d7eF8b06c75c3B8b8a95989708988e099`](https://bscscan.com/address/0x28d0851d7eF8b06c75c3B8b8a95989708988e099) |
| **LPN TOKEN (LPNT)** | [`0x22456a4cc697aace2849280230Ab58266b54c999`](https://bscscan.com/address/0x22456a4cc697aace2849280230Ab58266b54c999) |
| USDT (BEP-20) | [`0x55d398326f99059fF775485246999027B3197955`](https://bscscan.com/address/0x55d398326f99059fF775485246999027B3197955) |
| USDT/LPNT PancakeSwap V3 pool (1%) | [`0xB940A92bAd2Ae7E86203a56d94Ad0E84c88E26a6`](https://bscscan.com/address/0xB940A92bAd2Ae7E86203a56d94Ad0E84c88E26a6) |

## How the plan works

**Entry tiers** — `activate(amount)` must match one of **70 / 100 / 200 USDT**. Every allocation and the
earnings cap scale with the chosen tier.

**Two structures**
- **Referral tree** — set on `register(sponsor)`. Drives the Referral and Leaders bonuses.
- **Global one-line** — assigned on first activation in activation order. Drives the Generation bonus.

**The 8-way split** (basis-point configurable, always sums to 100%):

| Allocation | % | Goes to |
|---|---|---|
| Referral | 10% | your direct sponsor |
| Generation | 1% × 10 | the 10 nearest **active** one-line uplines (auto-compressing) |
| Leaders (match) | 10% | the referral sponsor of each one-line earner (100% match) |
| Cashback | 10% | your sponsor, claimable in chunks of 20% of their active tier |
| Incentive | 20% | community/incentive pool |
| Product | 20% | accrues to your `tokenBalance`, redeemable as LPNT |
| Token liquidity | 10% | the USDT/LPNT liquidity position |
| Profit | 10% | protocol revenue + capped residuals |

**Earnings cap (4×)** — each activation tops your `cappingBalance` up by 400% of the tier. Referral,
Generation, Leaders and Cashback all draw it down; at zero the account rests until it re-activates
(keeping its original one-line slot). Income that would exceed the cap, or is owed to an inactive member,
is booked to protocol profit — never created from nothing.

**Product → LPNT** — the Product allocation is *accrued* at activation (keeping activation cheap) and
redeemed later via `withdrawToken()`, delivered from the in-contract LPNT reserve or swapped through the
USDT/LPNT pool.

**Solvent by construction** — every entry's USDT stays in the contract at activation; bonuses credit
internal balances that are withdrawable on demand.

## Repository layout

```
contracts/    Solidity sources (LegacyPrime, LegacyPrimeLiquidity, LPNToken) — fully NatSpec-documented
app/          React 19 + Vite + Tailwind v4 dApp (wagmi + Reown AppKit)
```

## Frontend — local development

```bash
cd app
npm install
cp .env.example .env      # add your Reown project id
npm run dev
```

The app targets BSC mainnet by default. The network is selected by a single constant in
`app/src/lib/appkit.ts`:

```ts
const DEFAULT_NETWORK: 'bsc' | 'bscTestnet' | 'local' = 'bsc'
```

Contract addresses live in `app/src/config/contracts.ts` (keyed by chain id, overridable via `VITE_*` env).

## Deploy

```bash
cd app
npm run deploy     # builds and publishes dist/ to the gh-pages branch
```

## Security

The contracts went through three adversarial review passes plus a stateful invariant suite (solvency and
earnings-cap invariants fuzzed at 128k calls with zero reverts). Core properties verified: solvent by
construction, the earnings cap can never be exceeded, and no reentrancy or unauthorized-withdrawal paths.

> Admin/owner keys are trusted operators by design — see the NatSpec on the admin functions for the exact
> trust posture of each.

## License

MIT
