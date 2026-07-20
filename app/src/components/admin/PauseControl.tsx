import { Pause, Play } from 'lucide-react'
import { Card } from '../ui/Card'
import { TxButton } from '../TxButton'
import type { Abi } from 'viem'
import { LEGACYPRIME_ADMIN_ABI } from '../../abis/legacyPrimeAdmin'
import { useContracts } from '../../hooks/useLegacyPrime'
import { useTxAction } from '../../hooks/useTxAction'
import { usePaused } from '../../hooks/useAdmin'

// Emergency pause toggle — setPaused(!paused). Pausing freezes register/deposit/activate/claim/withdraw.
export function PauseControl({ explorer, onDone }: { explorer: string; onDone: () => void }) {
  const tx = useTxAction()
  const { plan } = useContracts()
  const { paused, refetch } = usePaused()
  const next = !paused

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-fg">Emergency pause</h3>
      <p className="mt-1 text-xs text-muted">
        {paused
          ? 'The plan is paused — all user actions are frozen.'
          : 'Freeze all user actions (register / deposit / activate / claim / withdraw).'}
      </p>
      <TxButton
        tx={tx}
        canRun={!!plan && paused !== undefined}
        idleLabel={next ? 'Pause plan' : 'Unpause plan'}
        icon={next ? Pause : Play}
        variant={next ? 'outline' : 'primary'}
        explorerBase={explorer}
        onSuccess={() => {
          refetch()
          onDone()
        }}
        className="mt-4"
        onRun={() => {
          if (next && !window.confirm('Pause the whole plan?')) return
          tx.run({ address: plan as `0x${string}`, abi: LEGACYPRIME_ADMIN_ABI as Abi, functionName: 'setPaused', args: [next] })
        }}
      />
    </Card>
  )
}
