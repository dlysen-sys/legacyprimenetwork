import { useState } from 'react'
import { Zap } from 'lucide-react'
import { parseUnits } from 'viem'
import { Card } from '../ui/Card'
import { TxButton } from '../TxButton'
import { LEGACYPRIME_ABI } from '../../abis/legacyPrime'
import { USDT_DECIMALS } from '../../config/contracts'
import { TIERS } from '../../config/plan'
import { useTxAction } from '../../hooks/useTxAction'
import type { Member } from '../../hooks/useLegacyPrime'
import { fmtUsdt } from '../../lib/format'

type Props = {
  plan: `0x${string}`
  explorer: string
  member: Member
  cooldown: { active: boolean; remaining: number }
  onDone: () => void
}

// Pay an entry package (70 / 100 / 200 USDT) from your walletBalance to start (or renew) a cycle.
// One tier at a time; re-activation is only possible once the previous cycle's cap is reached.
export function ActivateCard({ plan, explorer, member, cooldown, onDone }: Props) {
  const tx = useTxAction()
  const [tier, setTier] = useState<(typeof TIERS)[number]>(TIERS[0])

  const wei = parseUnits(String(tier), USDT_DECIMALS)
  const alreadyActive = member.active
  const enoughBalance = member.walletBalance >= wei
  const canRun = !alreadyActive && enoughBalance

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-fg">
        <Zap size={18} className="text-accent" />
        <h2 className="text-base font-semibold">Activate</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        Pays the tier from your wallet balance and opens a 4× earnings cycle.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {TIERS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTier(t)}
            className={`rounded-xl border p-3 text-center transition-colors ${
              tier === t
                ? 'border-primary bg-primary/10 text-fg'
                : 'border-border text-muted hover:bg-surface'
            }`}
          >
            <span className="block text-lg font-semibold">{t}</span>
            <span className="block text-xs">USDT</span>
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted">
        Wallet balance: <span className="text-fg">{fmtUsdt(member.walletBalance)} USDT</span>
      </p>
      {alreadyActive && (
        <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
          You're already active. Re-activate after this cycle's cap is reached.
        </p>
      )}
      {!alreadyActive && !enoughBalance && (
        <p className="mt-1.5 text-xs text-red-500">Deposit at least {tier} USDT first.</p>
      )}

      <TxButton
        tx={tx}
        canRun={canRun}
        idleLabel={`Activate ${tier} USDT`}
        icon={Zap}
        variant="gold"
        explorerBase={explorer}
        cooldown={cooldown}
        onSuccess={onDone}
        className="mt-4"
        onRun={() =>
          tx.run({
            address: plan,
            abi: LEGACYPRIME_ABI,
            functionName: 'activate',
            args: [wei],
          })
        }
      />
    </Card>
  )
}
