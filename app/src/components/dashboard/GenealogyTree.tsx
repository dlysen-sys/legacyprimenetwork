import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronRight, ChevronDown, Loader2, Users, Copy, Check, RefreshCw, Search, X } from 'lucide-react'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useGenealogyChildren, type NodeSummary } from '../../hooks/useLegacyPrime'
import { useDownlineSearch } from '../../hooks/useDownlineSearch'
import { shortAddr, toNum } from '../../lib/format'

type NodeProps = {
  address: `0x${string}`
  summary?: NodeSummary
  depth: number
  isRoot?: boolean
}

// One member row + (when expanded) its direct downline, fetched lazily. Recurses for each child.
function TreeNode({ address, summary, depth, isRoot }: NodeProps) {
  const [open, setOpen] = useState(!!isRoot)
  const [copied, setCopied] = useState(false)
  const directs = Number(summary?.directCount ?? 0n)
  const hasKids = directs > 0

  const { nodes, total, isLoading } = useGenealogyChildren(address, open && hasKids)

  const copy = () => {
    navigator.clipboard?.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div>
      <div className="group flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-bg">
        <button
          type="button"
          onClick={() => hasKids && setOpen((o) => !o)}
          disabled={!hasKids}
          aria-label={hasKids ? (open ? 'Collapse' : 'Expand') : undefined}
          className="flex h-5 w-5 items-center justify-center rounded text-muted disabled:opacity-30"
        >
          {hasKids ? open ? <ChevronDown size={16} /> : <ChevronRight size={16} /> : <span className="h-1 w-1 rounded-full bg-border" />}
        </button>

        {/* status dot */}
        <span
          className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${summary?.active ? 'bg-emerald-500' : 'bg-muted/40'}`}
          title={summary?.active ? 'Active' : 'Inactive'}
        />

        <span className="font-mono text-sm text-fg">{shortAddr(address)}</span>

        {isRoot && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">You</span>
        )}
        {summary?.active && summary.activePackage > 0n && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
            {toNum(summary.activePackage)} USDT
          </span>
        )}

        <span className="ml-auto flex items-center gap-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Users size={12} /> {directs}
          </span>
          <button
            type="button"
            onClick={copy}
            className="opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Copy address"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
        </span>
      </div>

      {open && hasKids && (
        <div className="ml-[10px] border-l border-border pl-3">
          {isLoading && (
            <p className="flex items-center gap-1.5 py-1.5 pl-1.5 text-xs text-muted">
              <Loader2 size={12} className="animate-spin" /> Loading downline…
            </p>
          )}
          {nodes.map((n) => (
            <TreeNode key={n.address} address={n.address} summary={n.summary} depth={depth + 1} />
          ))}
          {total > BigInt(nodes.length) && (
            <p className="py-1 pl-1.5 text-xs text-muted">+{Number(total) - nodes.length} more…</p>
          )}
        </div>
      )}
    </div>
  )
}

// Genealogy (referral tree) rooted at the connected member. Each node expands to its direct downline.
// Header has a refresh (collapse + refetch) and a downline-only search.
export function GenealogyTree({ root, summary }: { root: `0x${string}`; summary: NodeSummary }) {
  const qc = useQueryClient()
  const [resetKey, setResetKey] = useState(0) // bump → remounts the tree (collapse to root)
  const [query, setQuery] = useState('')
  const { result, loading, search, clear } = useDownlineSearch(root)

  const refresh = () => {
    qc.invalidateQueries() // refetch all contract reads
    clear()
    setQuery('')
    setResetKey((k) => k + 1)
  }

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    search(query)
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-fg">
          <Users size={18} className="text-primary" />
          <h2 className="text-base font-semibold">Your genealogy</h2>
        </div>
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh"
          title="Reset & refresh"
          className="rounded-lg p-2 text-muted transition-colors hover:bg-bg hover:text-fg"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">
        Your referral network — expand any member to walk their downline. Search finds a wallet in your
        downline (you can look down, not up).
      </p>

      {/* downline search */}
      <form onSubmit={onSearch} className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            className="pl-8"
            placeholder="Search your downline by wallet address (0x…)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
          />
        </div>
        <Button type="submit" disabled={loading} className="shrink-0">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Search
        </Button>
      </form>

      {result && (
        <div className="mt-3">
          {result.found ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
              <span
                className={`h-2.5 w-2.5 rounded-full ${result.summary.active ? 'bg-emerald-500' : 'bg-muted/40'}`}
              />
              <span className="font-mono text-sm text-fg">{shortAddr(result.address)}</span>
              {result.summary.active && result.summary.activePackage > 0n && (
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                  {toNum(result.summary.activePackage)} USDT
                </span>
              )}
              <span className="text-xs text-muted">
                Level {result.depth} below you · {Number(result.summary.directCount)} directs
              </span>
              <button onClick={clear} aria-label="Clear" className="ml-auto text-muted hover:text-fg">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-bg p-3 text-sm text-muted">
              <span>{result.reason}</span>
              <button onClick={clear} aria-label="Clear" className="ml-auto hover:text-fg">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* tree */}
      <div className="mt-4">
        {Number(summary.directCount) === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted">
            No direct referrals yet. Share your wallet as a sponsor to grow your tree.
          </p>
        ) : (
          <TreeNode key={resetKey} address={root} summary={summary} depth={0} isRoot />
        )}
      </div>
    </Card>
  )
}
