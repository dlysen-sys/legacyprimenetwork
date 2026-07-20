import { CircleCheck, CirclePause } from 'lucide-react'
import type { Member } from '../../hooks/useLegacyPrime'
import { fmtUsdt, toNum } from '../../lib/format'

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-fg">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  )
}

// At-a-glance account state for a registered member: activation status, wallet balance, cap progress,
// cashback, and lifetime bonus totals.
export function StatusGrid({ member }: { member: Member }) {
  const { active, walletBalance, activePackage, cappingBalance, earningsCap, cashBackAvailable } = member

  // Cap progress = how much of this cycle's 4× cap has already been earned (drawn down).
  const earned = earningsCap > cappingBalance ? earningsCap - cappingBalance : 0n
  const pct = earningsCap > 0n ? Math.min(100, Number((earned * 100n) / earningsCap)) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {active ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CircleCheck size={14} /> Active — {toNum(activePackage)} USDT tier
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
            <CirclePause size={14} /> Resting — activate to start a cycle
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Wallet balance" value={`${fmtUsdt(walletBalance)} USDT`} sub="Withdrawable" />
        <Stat label="Cashback available" value={`${fmtUsdt(cashBackAvailable)} USDT`} />
        <Stat
          label="Earnings cap left"
          value={`${fmtUsdt(cappingBalance)} USDT`}
          sub={active ? `of ${fmtUsdt(earningsCap)} this cycle` : 'inactive'}
        />
      </div>

      {active && earningsCap > 0n && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>Cycle earned</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Referral" value={fmtUsdt(member.referralBalance)} sub="lifetime" />
        <Stat label="Generation" value={fmtUsdt(member.generationBalance)} sub="lifetime" />
        <Stat label="Leaders" value={fmtUsdt(member.leadersBalance)} sub="lifetime" />
      </div>
    </div>
  )
}
