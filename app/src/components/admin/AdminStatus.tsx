import { RefreshCw, CircleCheck, CirclePause } from 'lucide-react'
import { Card } from '../ui/Card'
import { useAdminData } from '../../hooks/useAdmin'
import { fmtUsdt, shortAddr } from '../../lib/format'
import { formatCooldown } from '../../hooks/useCooldown'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-fg" title={value}>
        {value}
      </p>
    </div>
  )
}

const pct = (bps?: bigint) => (bps === undefined ? '—' : `${Number(bps) / 100}%`)

// Live snapshot of protocol state: pools, params, fee config. Refreshes on demand + after any admin tx.
export function AdminStatus({ onRefresh }: { onRefresh?: () => void }) {
  const d = useAdminData()

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-fg">Protocol status</h2>
        <div className="flex items-center gap-3">
          {d.paused === undefined ? null : d.paused ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              <CirclePause size={13} /> Paused
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CircleCheck size={13} /> Live
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              d.refetch()
              onRefresh?.()
            }}
            aria-label="Refresh"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-bg hover:text-fg"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Treasury (USDT)" value={`${fmtUsdt(d.treasury)}`} />
        <Stat label="LPNT reserve" value={fmtUsdt(d.lpntReserve)} />
        <Stat label="Incentive pool" value={fmtUsdt(d.incentiveBalance)} />
        <Stat label="Liquidity pool" value={fmtUsdt(d.liquidityBalance)} />
        <Stat label="Product pool" value={fmtUsdt(d.productBalance)} />
        <Stat label="Profit pool" value={fmtUsdt(d.profitBalance)} />
        <Stat label="Collected fees" value={fmtUsdt(d.collectedFees)} />
        <Stat label="Owner" value={shortAddr(d.owner)} />
        <Stat label="System fee" value={`${fmtUsdt(d.systemFee)} USDT`} />
        <Stat label="System wallet" value={shortAddr(d.systemWallet)} />
        <Stat label="Withdraw fee" value={pct(d.withdrawFeeBps)} />
        <Stat label="Min withdraw" value={`${fmtUsdt(d.minWithdraw)} USDT`} />
        <Stat label="Withdraw cooldown" value={d.withdrawCooldown ? formatCooldown(Number(d.withdrawCooldown)) : '—'} />
        <Stat label="Cashback claim" value={pct(d.cashBackClaimBps)} />
        <Stat label="Earnings cap" value={pct(d.capBps)} />
        <Stat label="Product rate" value={`${fmtUsdt(d.productRate)} LPNT/USDT`} />
        <Stat label="LP slippage" value={pct(d.liquiditySlippageBps)} />
        <Stat label="LP manager" value={shortAddr(d.liquidity)} />
      </div>
    </Card>
  )
}
