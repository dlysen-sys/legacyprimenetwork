import { useState } from 'react'
import { ArrowDownToLine, CheckCircle2 } from 'lucide-react'
import { parseUnits } from 'viem'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { TxButton } from '../TxButton'
import { LEGACYPRIME_ABI } from '../../abis/legacyPrime'
import { ERC20_ABI } from '../../abis/erc20'
import { USDT_DECIMALS } from '../../config/contracts'
import { useTxAction } from '../../hooks/useTxAction'
import { fmtUsdt } from '../../lib/format'

const MIN_DEPOSIT = 70 // entryPackageA — smallest tier

type Props = {
  plan: `0x${string}`
  usdtToken: `0x${string}`
  explorer: string
  balance?: bigint
  allowance?: bigint
  cooldown: { active: boolean; remaining: number }
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

// Fund your withdrawable walletBalance with USDT (used to pay for activation). ERC-20 approve → deposit;
// approve is not anti-spam-gated, deposit is. Minimum is one entry package (70 USDT).
export function DepositCard({ plan, usdtToken, explorer, balance, allowance, cooldown, onDone }: Props) {
  const approveTx = useTxAction()
  const depositTx = useTxAction()
  const [amount, setAmount] = useState('')

  const wei = safeParse(amount)
  const belowMin = amount !== '' && Number(amount) < MIN_DEPOSIT
  const insufficient = wei !== null && balance !== undefined && wei > balance
  const needsApproval = wei !== null && allowance !== undefined && allowance < wei

  const validAmount = wei !== null && !belowMin && !insufficient

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-fg">
        <ArrowDownToLine size={18} className="text-primary" />
        <h2 className="text-base font-semibold">Deposit USDT</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        Adds USDT to your wallet balance. Minimum {MIN_DEPOSIT} USDT (one entry package).
      </p>

      <label className="mt-4 block text-xs text-muted">
        Balance: <span className="text-fg">{fmtUsdt(balance)} USDT</span>
      </label>
      <Input
        className="mt-1.5"
        type="number"
        inputMode="decimal"
        min={MIN_DEPOSIT}
        placeholder={`e.g. ${MIN_DEPOSIT}`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      {belowMin && <p className="mt-1.5 text-xs text-red-500">Minimum deposit is {MIN_DEPOSIT} USDT.</p>}
      {insufficient && <p className="mt-1.5 text-xs text-red-500">More than your USDT balance.</p>}

      {needsApproval ? (
        <TxButton
          tx={approveTx}
          canRun={validAmount}
          idleLabel="Approve USDT"
          explorerBase={explorer}
          onSuccess={onDone}
          className="mt-4"
          onRun={() =>
            approveTx.run({
              address: usdtToken,
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [plan, wei!],
            })
          }
        />
      ) : (
        <TxButton
          tx={depositTx}
          canRun={validAmount}
          idleLabel="Deposit"
          icon={ArrowDownToLine}
          explorerBase={explorer}
          cooldown={cooldown}
          onSuccess={() => {
            setAmount('')
            onDone()
          }}
          className="mt-4"
          onRun={() =>
            depositTx.run({
              address: plan,
              abi: LEGACYPRIME_ABI,
              functionName: 'deposit',
              args: [wei!],
            })
          }
        />
      )}

      {!needsApproval && validAmount && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={12} /> Approved — ready to deposit.
        </p>
      )}
    </Card>
  )
}
