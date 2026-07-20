import { useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { isAddress } from 'viem'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { TxButton } from '../TxButton'
import { LEGACYPRIME_ABI } from '../../abis/legacyPrime'
import { useTxAction } from '../../hooks/useTxAction'

type Props = {
  plan: `0x${string}`
  explorer: string
  cooldown: { active: boolean; remaining: number }
  onDone: () => void
}

// Read a sponsor from ?ref= / ?sponsor= so referral links land pre-filled.
function sponsorFromUrl(): string {
  if (typeof window === 'undefined') return ''
  const p = new URLSearchParams(window.location.search)
  return p.get('ref') || p.get('sponsor') || ''
}

// Gate shown when the connected wallet is NOT yet registered in the referral tree.
// Registration is free — the entry package is paid later at activation.
export function RegisterGate({ plan, explorer, cooldown, onDone }: Props) {
  const tx = useTxAction()
  const [sponsor, setSponsor] = useState(sponsorFromUrl)

  const valid = useMemo(() => isAddress(sponsor.trim()), [sponsor])

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-fg">
        <UserPlus size={18} className="text-primary" />
        <h2 className="text-lg font-semibold">Join LegacyPrime</h2>
      </div>
      <p className="mt-2 text-sm text-muted">
        Your wallet isn't registered yet. Register under your sponsor to unlock deposit, activation,
        cashback, and withdrawals. Registration is free — you pay an entry package (70 / 100 / 200 USDT)
        when you activate.
      </p>

      <label className="mt-5 block text-sm font-medium text-fg">Sponsor address</label>
      <Input
        className="mt-1.5 font-mono"
        placeholder="0x… your referrer's wallet"
        value={sponsor}
        onChange={(e) => setSponsor(e.target.value)}
        spellCheck={false}
      />
      {sponsor && !valid && <p className="mt-1.5 text-xs text-red-500">Enter a valid 0x address.</p>}

      <TxButton
        tx={tx}
        canRun={valid}
        idleLabel="Register"
        icon={UserPlus}
        explorerBase={explorer}
        cooldown={cooldown}
        onSuccess={onDone}
        className="mt-5"
        onRun={() =>
          tx.run({
            address: plan,
            abi: LEGACYPRIME_ABI,
            functionName: 'register',
            args: [sponsor.trim() as `0x${string}`],
          })
        }
      />
    </Card>
  )
}
