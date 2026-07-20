import { Gift } from 'lucide-react'
import { Card } from '../ui/Card'
import { TxButton } from '../TxButton'
import { LEGACYPRIME_ABI } from '../../abis/legacyPrime'
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

// Claim one cashback chunk — cashBackClaimBps (20%) of your active tier (14 / 20 / 40 USDT). Requires
// that much accrued cashback and an active package. Sent straight to your wallet.
export function ClaimCashbackCard({ plan, explorer, member, cooldown, onDone }: Props) {
  const tx = useTxAction()

  // Chunk mirrors the contract default cashBackClaimBps = 2000 (20% of the active tier).
  const chunk = (member.activePackage * 2000n) / 10000n
  const hasPackage = member.activePackage > 0n
  const enough = chunk > 0n && member.cashBackAvailable >= chunk
  const canRun = hasPackage && enough
  const shortBy = chunk > member.cashBackAvailable ? chunk - member.cashBackAvailable : 0n

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-fg">
        <Gift size={18} className="text-primary" />
        <h2 className="text-base font-semibold">Claim cashback</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        Pays one chunk of {hasPackage ? `${fmtUsdt(chunk)} USDT` : '20% of your active tier'} to your
        wallet.
      </p>

      <p className="mt-4 text-xs text-muted">
        Available: <span className="text-fg">{fmtUsdt(member.cashBackAvailable)} USDT</span>
      </p>
      {!hasPackage && (
        <p className="mt-1.5 text-xs text-muted">Activate a package to unlock cashback claims.</p>
      )}
      {hasPackage && !enough && (
        <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
          Accrue {fmtUsdt(shortBy)} more USDT to claim a full chunk.
        </p>
      )}

      <TxButton
        tx={tx}
        canRun={canRun}
        idleLabel="Claim cashback"
        icon={Gift}
        explorerBase={explorer}
        cooldown={cooldown}
        onSuccess={onDone}
        className="mt-4"
        onRun={() =>
          tx.run({
            address: plan,
            abi: LEGACYPRIME_ABI,
            functionName: 'claimCashBack',
            args: [],
          })
        }
      />
    </Card>
  )
}
