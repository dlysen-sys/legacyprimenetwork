import { useState } from 'react'
import { ArrowUpFromLine } from 'lucide-react'
import { parseUnits } from 'viem'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { TxButton } from '../TxButton'
import { LEGACYPRIME_ABI } from '../../abis/legacyPrime'
import { USDT_DECIMALS } from '../../config/contracts'
import { useTxAction } from '../../hooks/useTxAction'
import type { Member } from '../../hooks/useLegacyPrime'
import { fmtUsdt } from '../../lib/format'

const MIN_WITHDRAW = 10 // minWithdraw
const FEE_BPS = 1000n // withdrawFeeBps — 10% processing fee

type CooldownState = { active: boolean; remaining: number }

type Props = {
  plan: `0x${string}`
  explorer: string
  member: Member
  cooldown: CooldownState // anti-spam (9s)
  withdrawCd: CooldownState // 24h withdraw cooldown
  onDone: () => void
}

function safeParse(s: string): bigint | null {
  try {
    if (!s || Number(s) <= 0) return null
    return parseUnits(s, USDT_DECIMALS)
  } catch {
    return null
  }
}

// Withdraw USDT from your wallet balance. 24h cooldown; a 10% processing fee is the only deduction.
export function WithdrawCard({ plan, explorer, member, cooldown, withdrawCd, onDone }: Props) {
  const tx = useTxAction()
  const [amount, setAmount] = useState('')

  const wei = safeParse(amount)
  const belowMin = amount !== '' && Number(amount) < MIN_WITHDRAW
  const insufficient = wei !== null && wei > member.walletBalance
  const validAmount = wei !== null && !belowMin && !insufficient

  const fee = wei !== null ? (wei * FEE_BPS) / 10000n : 0n
  const net = wei !== null ? wei - fee : 0n

  // Whichever gate is active blocks the button; show the longer remaining.
  const gate: CooldownState = {
    active: cooldown.active || withdrawCd.active,
    remaining: Math.max(cooldown.remaining, withdrawCd.remaining),
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-fg">
        <ArrowUpFromLine size={18} className="text-primary" />
        <h2 className="text-base font-semibold">Withdraw USDT</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        Sends USDT to your wallet. 10% fee, 24h cooldown. Minimum {MIN_WITHDRAW} USDT.
      </p>

      <label className="mt-4 block text-xs text-muted">
        Withdrawable: <span className="text-fg">{fmtUsdt(member.walletBalance)} USDT</span>
      </label>
      <Input
        className="mt-1.5"
        type="number"
        inputMode="decimal"
        min={MIN_WITHDRAW}
        placeholder={`e.g. ${MIN_WITHDRAW}`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      {belowMin && <p className="mt-1.5 text-xs text-red-500">Minimum withdrawal is {MIN_WITHDRAW} USDT.</p>}
      {insufficient && <p className="mt-1.5 text-xs text-red-500">More than your withdrawable balance.</p>}
      {validAmount && (
        <p className="mt-2 text-xs text-muted">
          You receive <span className="font-semibold text-fg">{fmtUsdt(net)} USDT</span> (fee{' '}
          {fmtUsdt(fee)}).
        </p>
      )}

      <TxButton
        tx={tx}
        canRun={validAmount}
        idleLabel="Withdraw"
        icon={ArrowUpFromLine}
        variant="outline"
        explorerBase={explorer}
        cooldown={gate}
        onSuccess={() => {
          setAmount('')
          onDone()
        }}
        className="mt-4"
        onRun={() =>
          tx.run({
            address: plan,
            abi: LEGACYPRIME_ABI,
            functionName: 'withdraw',
            args: [wei!],
          })
        }
      />
    </Card>
  )
}
