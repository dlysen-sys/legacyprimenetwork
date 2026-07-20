import { Coins } from 'lucide-react'
import { Card } from '../ui/Card'
import { TxButton } from '../TxButton'
import { LEGACYPRIME_ABI } from '../../abis/legacyPrime'
import { useTxAction } from '../../hooks/useTxAction'
import { fmtUsdt } from '../../lib/format'

type Props = {
  plan: `0x${string}`
  explorer: string
  tokenBalance?: bigint // accrued Product allocation (USDT)
  productRate?: bigint // LPNT per 1 USDT (1e18-scaled)
  cooldown: { active: boolean; remaining: number }
  onDone: () => void
}

// Redeem your accrued Product allocation (tokenBalance) as LPN TOKEN. The plan books 20% of every entry
// to tokenBalance at activation; withdrawToken() delivers the LPNT (from the reserve, else a swap). If
// neither is available the call reverts and keeps your balance — surfaced by the button's error line.
export function ClaimTokenCard({ plan, explorer, tokenBalance, productRate, cooldown, onDone }: Props) {
  const tx = useTxAction()

  const accrued = tokenBalance ?? 0n
  // LPNT out = tokenBalance × productRate / 1e18 (rate defaults 1:1 while loading).
  const lpntOut = productRate ? (accrued * productRate) / 1_000_000_000_000_000_000n : accrued
  const canRun = accrued > 0n

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-fg">
        <Coins size={18} className="text-accent" />
        <h2 className="text-base font-semibold">Claim LPNT</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        Redeem your accrued product allocation as LPN TOKEN, delivered to your wallet.
      </p>

      <p className="mt-4 text-xs text-muted">
        Accrued: <span className="text-fg">{fmtUsdt(accrued)} USDT</span>
        {canRun && (
          <>
            {' '}
            → <span className="text-fg">{fmtUsdt(lpntOut)} LPNT</span>
          </>
        )}
      </p>
      {!canRun && (
        <p className="mt-1.5 text-xs text-muted">Activate a package to accrue product LPNT.</p>
      )}

      <TxButton
        tx={tx}
        canRun={canRun}
        idleLabel="Claim LPNT"
        icon={Coins}
        variant="gold"
        explorerBase={explorer}
        cooldown={cooldown}
        onSuccess={onDone}
        className="mt-4"
        onRun={() =>
          tx.run({
            address: plan,
            abi: LEGACYPRIME_ABI,
            functionName: 'withdrawToken',
            args: [],
          })
        }
      />
    </Card>
  )
}
