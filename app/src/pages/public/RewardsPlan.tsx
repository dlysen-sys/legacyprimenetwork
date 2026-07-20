import { Link } from 'react-router-dom'
import { ShieldCheck, Repeat } from 'lucide-react'
import { ALLOCATIONS, TIERS, CAP_MULTIPLE, CASHBACK_CLAIM_PCT } from '../../config/plan'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { IncomeCalculator } from '../../components/IncomeCalculator'
import { Logo } from '../../components/Logo'

export function RewardsPlan() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      {/* hero */}
      <div className="text-center">
        <div className="flex justify-center mb-5">
          <Logo size={52} withWord={false} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-fg text-balance">Rewards Plan</h1>
        <p className="mt-3 text-muted max-w-2xl mx-auto">
          Activate at one of three tiers — <span className="text-fg font-semibold">70, 100, or 200 USDT</span> —
          and it splits eight ways. Four allocations pay you and your upline; the rest fund the LPNT token,
          liquidity, and the protocol. Every earner can take up to <span className="text-fg font-semibold">{CAP_MULTIPLE}×
          their entry</span> per activation cycle.
        </p>
      </div>

      {/* tiers */}
      <div className="grid grid-cols-3 gap-4 mt-10">
        {TIERS.map((t) => (
          <Card key={t} className="p-5 text-center">
            <div className="font-mono font-black text-2xl text-fg tabular-nums">{t}</div>
            <div className="text-[11px] text-muted -mt-0.5">USDT entry</div>
            <div className="mt-3 pt-3 border-t border-border space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted">Earnings cap</span><span className="text-accent font-mono font-semibold tabular-nums">{t * CAP_MULTIPLE}</span></div>
              <div className="flex justify-between"><span className="text-muted">Cashback / claim</span><span className="text-fg font-mono tabular-nums">{t * CASHBACK_CLAIM_PCT}</span></div>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-center text-xs text-muted mt-3">
        All eight allocations and the {CAP_MULTIPLE}× cap scale with the tier you choose.
      </p>

      {/* the eight allocations */}
      <div className="grid gap-4 sm:grid-cols-2 mt-10">
        {ALLOCATIONS.map((a) => (
          <Card key={a.key} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-fg">{a.name}</h2>
                <p className="text-xs text-muted mt-0.5">{a.earner}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono font-bold text-accent tabular-nums">{a.pct}%</div>
                {a.sub && <div className="text-[11px] text-muted">{a.sub}</div>}
              </div>
            </div>
            <p className="text-sm text-muted mt-3 leading-relaxed">{a.blurb}</p>
            {a.capped && (
              <span className="inline-flex items-center gap-1 mt-3 text-[11px] text-primary">
                <ShieldCheck size={12} /> Counts toward your {CAP_MULTIPLE}× cap
              </span>
            )}
          </Card>
        ))}
      </div>

      {/* the cap */}
      <Card className="p-6 mt-6">
        <div className="flex items-center gap-2">
          <Repeat size={18} className="text-primary" />
          <h2 className="font-bold text-fg">The {CAP_MULTIPLE}× earnings cap</h2>
        </div>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          Each activation opens <span className="text-fg font-semibold">{CAP_MULTIPLE}× your entry</span> of earning
          room (e.g. 400 USDT on the 100 tier). Your capped bonuses — Referral, Generation, Leaders, and Cashback —
          draw it down. When it reaches zero your account rests; re-activate to refresh the full cap and keep your
          global one-line position — you can even step up to a higher tier. Anything beyond the cap, or owed to an
          inactive member, rolls to the protocol, so the plan stays solvent by design.
        </p>
      </Card>

      {/* calculator */}
      <div className="mt-10">
        <IncomeCalculator />
      </div>

      <div className="text-center mt-10">
        <Link to="/login"><Button>Activate to start earning</Button></Link>
      </div>
    </div>
  )
}
