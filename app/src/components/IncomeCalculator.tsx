import { useState } from 'react'
import { Users, RefreshCw, TrendingUp, Network, Crown, type LucideIcon } from 'lucide-react'
import {
  TIERS, REFERRAL_PCT, CASHBACK_PCT, GENERATION_PCT, GENERATION_LEVELS, LEADERS_MATCH,
  CAP_MULTIPLE, type Tier,
} from '../config/plan'
import { Card } from './ui/Card'

const usd = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDT`

function Slider({
  icon: Icon, label, value, setValue, min, max, suffix = '', help,
}: {
  icon: LucideIcon; label: string; value: number; setValue: (n: number) => void
  min: number; max: number; suffix?: string; help?: string
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-sm text-muted">
          <Icon size={14} /> {label}
        </span>
        <span className="font-mono font-bold text-fg tabular-nums">{value}{suffix}</span>
      </span>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-primary cursor-pointer"
      />
      {help && <span className="block text-[11px] text-muted/80 mt-1.5">{help}</span>}
    </label>
  )
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 text-center ${highlight ? 'border-primary/40 bg-primary/10' : 'border-border bg-bg'}`}>
      <div className={`font-mono font-bold text-lg tabular-nums ${highlight ? 'text-primary' : 'text-fg'}`}>{value}</div>
      <div className="text-[11px] text-muted mt-0.5">{label}</div>
    </div>
  )
}

// Mirrors legacyprime.sol distribution — the four CAPPED bonuses you can earn:
//   Referral  (10%)      → you, per DIRECT activation (referralBps 1000).
//   Generation(1%/level) → you, per activation on the one-line BELOW you (generationBpsPerLevel 100 × 10).
//   Leaders   (100% match)→ you, per unit of Generation YOUR DIRECTS earn (leadersMatchBps 10000).
//   Cashback  (10%)      → you, per DIRECT activation (cashBackBps 1000), claimed in tier-chunks.
// All four draw the same cappingBalance (4× the tier) down; at 0 the account rests until re-activation.
export function IncomeCalculator() {
  const [tier, setTier] = useState<Tier>(100)
  const [directs, setDirects] = useState(5)
  const [repeats, setRepeats] = useState(1)
  const [lineActs, setLineActs] = useState(10)
  const [perDirectLineActs, setPerDirectLineActs] = useState(10)

  const directActivations = directs * (1 + repeats)
  const referral = directActivations * tier * REFERRAL_PCT
  const cashback = directActivations * tier * CASHBACK_PCT
  const generation = lineActs * tier * GENERATION_PCT
  // Leaders = 100% match of the Generation EACH direct earns, summed over your directs.
  // genPerDirect = that direct's one-line activations × 1% of tier; leaders = directs × genPerDirect × match.
  const genPerDirect = perDirectLineActs * tier * GENERATION_PCT
  const leaders = directs * genPerDirect * LEADERS_MATCH
  const combined = referral + generation + leaders + cashback
  const cap = tier * CAP_MULTIPLE
  const cycles = Math.max(1, Math.ceil(combined / cap))

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <TrendingUp size={18} className="text-accent" />
        <h3 className="font-bold text-fg">Income calculator</h3>
      </div>
      <p className="text-sm text-muted mt-1 mb-6">
        The four capped bonuses from the contract: Referral + Cashback (from your directs), Generation (from
        your one-line), and Leaders (a 100% match on the Generation your directs earn). Assumes every
        activation is at the tier you pick.
      </p>

      {/* tier selector */}
      <div className="mb-6">
        <span className="text-sm text-muted">Entry tier</span>
        <div className="mt-2 inline-flex rounded-lg border border-border bg-bg p-1">
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                tier === t ? 'bg-primary text-primary-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {t} USDT
            </button>
          ))}
        </div>
      </div>

      {/* direct team → referral + cashback */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Slider icon={Users} label="Direct referrals" value={directs} setValue={setDirects} min={0} max={50} />
        <Slider icon={RefreshCw} label="Repeat activations / direct" value={repeats} setValue={setRepeats} min={0} max={12} suffix="×" />
      </div>

      {/* one-line → generation + leaders */}
      <div className="mt-6 space-y-6">
        <Slider
          icon={Network} label="One-line activations below you" value={lineActs} setValue={setLineActs} min={0} max={200}
          help={`Generation: you earn ${(GENERATION_PCT * 100).toFixed(0)}% of each activation by the members beneath you on the global one-line (up to ${GENERATION_LEVELS} levels).`}
        />
        <Slider
          icon={Crown} label="One-line activations below each direct" value={perDirectLineActs} setValue={setPerDirectLineActs} min={0} max={100}
          help={`Leaders: each direct earns ${usd(genPerDirect)} in Generation here; as their referral sponsor you match ${(LEADERS_MATCH * 100).toFixed(0)}% of it across all ${directs} direct${directs === 1 ? '' : 's'} — paid while you're active and within your ${CAP_MULTIPLE}× cap.`}
        />
      </div>

      {/* outputs — contract order: Referral, Generation, Leaders, Cashback */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7">
        <Stat label="Referral (10%)" value={usd(referral)} />
        <Stat label="Generation (1%)" value={usd(generation)} />
        <Stat label="Leaders (match)" value={usd(leaders)} />
        <Stat label="Cashback (10%)" value={usd(cashback)} />
      </div>
      <div className="mt-3">
        <Stat label="Combined per cycle" value={usd(combined)} highlight />
      </div>

      <p className="text-xs text-muted mt-5 leading-relaxed">
        {directActivations} direct activation{directActivations === 1 ? '' : 's'} ({directs} × {1 + repeats}) drive
        Referral + Cashback; {lineActs} one-line activation{lineActs === 1 ? '' : 's'} below you drive Generation;
        and each of your {directs} direct{directs === 1 ? '' : 's'} earns {usd(genPerDirect)} in Generation that you
        match 100% ({directs} × {usd(genPerDirect)} = {usd(leaders)} Leaders) — all at the {tier} USDT tier. Your cap
        is {usd(cap)} ({CAP_MULTIPLE}× the tier) per cycle, so the full {usd(combined)} takes {cycles} active
        cycle{cycles === 1 ? '' : 's'}; re-activate to refresh the cap and keep earning.
      </p>
    </Card>
  )
}
