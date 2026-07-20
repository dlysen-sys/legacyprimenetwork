import { ArrowLeftRight, ExternalLink } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { SWAP_URL } from '../../config/contracts'

// Swap USDT ⇄ LPNT. In-app swap lands later; for now this is a ready external link to the
// USDT/LPNT pool (PancakeSwap deep-link, override with VITE_SWAP_URL). Swap the <a> for an
// on-chain call to LegacyPrimeLiquidity.swapUSDTToLPNT when the in-app flow ships.
export function SwapCard() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-fg">
        <ArrowLeftRight size={18} className="text-accent" />
        <h2 className="text-base font-semibold">Swap token</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        Trade USDT ⇄ LPNT on the liquidity pool. In-app swap is coming soon — for now this opens the
        pool directly.
      </p>

      <a href={SWAP_URL} target="_blank" rel="noreferrer" className="mt-4 block">
        <Button variant="outline" className="w-full py-3">
          <ArrowLeftRight size={16} /> Open swap <ExternalLink size={14} className="opacity-60" />
        </Button>
      </a>
    </Card>
  )
}
