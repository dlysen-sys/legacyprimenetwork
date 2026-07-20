import { ListTree, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import { Card } from '../ui/Card'
import { useOneLine } from '../../hooks/useOneLine'
import { shortAddr, toNum } from '../../lib/format'

// One-line (single global line) genealogy for the connected wallet: starts at YOU and walks up the
// `line` predecessors to root. Paginated. Complements the referral tree above.
export function OneLineTable({ you }: { you: `0x${string}` }) {
  const { pageRows, page, pageSize, pageCount, hasPrev, hasNext, next, prev, loading, total, refresh } =
    useOneLine(you, 3)

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-fg">
          <ListTree size={18} className="text-primary" />
          <h2 className="text-base font-semibold">Your one-line</h2>
        </div>
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh"
          title="Reset & refresh"
          className="rounded-lg p-2 text-muted transition-colors hover:bg-bg hover:text-fg"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">
        The single global line above you — from your wallet up to the company root. These uplines earn
        Generation when you activate. 10 per page.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="py-2 pr-3 font-medium">#</th>
              <th className="py-2 pr-3 font-medium">Member</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Tier</th>
              <th className="py-2 font-medium">Directs</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => {
              const idx = page * pageSize + i
              const isYou = idx === 0
              return (
                <tr
                  key={row.address}
                  className={`border-b border-border/60 ${isYou ? 'bg-primary/5' : ''}`}
                >
                  <td className="py-2.5 pr-3 text-muted">{idx + 1}</td>
                  <td className="py-2.5 pr-3">
                    <span className="font-mono text-fg">{shortAddr(row.address)}</span>
                    {isYou && (
                      <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                        You
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${row.summary.active ? 'bg-emerald-500' : 'bg-muted/40'}`}
                      />
                      <span className="text-muted">{row.summary.active ? 'Active' : 'Inactive'}</span>
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-fg">
                    {row.summary.activePackage > 0n ? `${toNum(row.summary.activePackage)} USDT` : '—'}
                  </td>
                  <td className="py-2.5 text-muted">{Number(row.summary.directCount)}</td>
                </tr>
              )
            })}

            {loading && total === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-muted">
                  <Loader2 size={16} className="mx-auto animate-spin" />
                </td>
              </tr>
            )}
            {!loading && total === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-muted">
                  You're not in the one-line yet — activate a package to take your slot.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted">
          Page {page + 1} of {pageCount}
          {total > 0 ? ` · ${total} in line` : ''}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={!hasPrev}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-fg hover:bg-surface disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!hasNext || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-fg hover:bg-surface disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null} Next{' '}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </Card>
  )
}
