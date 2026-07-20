import { useEffect, useRef } from 'react'
import { Loader2, CheckCircle2, AlertCircle, type LucideIcon } from 'lucide-react'
import type { TxAction } from '../hooks/useTxAction'
import { Button } from './ui/Button'
import { formatCooldown } from '../hooks/useCooldown'

type CooldownState = { active: boolean; remaining: number }

type Props = {
  tx: TxAction
  canRun: boolean
  onRun: () => void
  idleLabel: string
  icon?: LucideIcon
  explorerBase?: string
  cooldown?: CooldownState // anti-spam / withdraw gate — disables + counts down
  onSuccess?: () => void // fired once when the tx confirms (refresh reads)
  pendingLabel?: string
  signingLabel?: string
  successLabel?: string
  variant?: 'primary' | 'gold' | 'outline'
  className?: string
}

// Standard write button: disabled by default → spinner while signing/pending → explicit success/error
// line, with a 60s "still pending" prompt. The page owns `canRun` + the tx config; the button owns the
// lifecycle. See references/sops/smart-contract-integration.md → "Transaction Button Lifecycle".
export function TxButton({
  tx, canRun, onRun, idleLabel, icon: Icon, explorerBase, cooldown, onSuccess,
  pendingLabel = 'Confirming…', signingLabel = 'Confirm in wallet…', successLabel = 'Done',
  variant = 'primary', className = '',
}: Props) {
  const { phase, busy, slow, message, hash } = tx

  // Fire onSuccess exactly once per confirmed tx (guard against effect re-runs).
  const firedFor = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (phase === 'success' && hash && firedFor.current !== hash) {
      firedFor.current = hash
      onSuccess?.()
    }
  }, [phase, hash, onSuccess])

  const cooling = !!cooldown?.active
  const label =
    phase === 'success' ? successLabel
    : phase === 'signing' ? signingLabel
    : phase === 'pending' ? pendingLabel
    : cooling ? `Wait ${formatCooldown(cooldown!.remaining)}`
    : idleLabel

  return (
    <div className={`space-y-2 ${className}`}>
      <Button
        variant={variant}
        onClick={onRun}
        disabled={!canRun || busy || cooling}
        className="w-full py-3"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : Icon ? <Icon size={16} /> : null}
        {label}
      </Button>

      {slow && phase === 'pending' && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary/10 p-3 text-xs text-fg">
          <span>Still pending after 60s — the tx may still mine.</span>
          <span className="flex flex-shrink-0 gap-3 font-semibold">
            <button onClick={tx.keepWaiting} className="text-primary hover:underline">Wait</button>
            <button onClick={tx.cancel} className="text-red-500 hover:underline">Cancel</button>
          </span>
        </div>
      )}

      {phase === 'success' && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={14} className="flex-shrink-0" /> {message}
          {explorerBase && hash && (
            <a href={`${explorerBase}/tx/${hash}`} target="_blank" rel="noreferrer" className="ml-auto underline">
              View
            </a>
          )}
        </p>
      )}

      {phase === 'error' && (
        <p className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{message}</span>
          <button onClick={tx.reset} className="flex-shrink-0 font-semibold hover:underline">Retry</button>
        </p>
      )}
    </div>
  )
}
