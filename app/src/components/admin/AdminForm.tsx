import { useState } from 'react'
import { parseUnits, isAddress, type Abi } from 'viem'
import type { LucideIcon } from 'lucide-react'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { TxButton } from '../TxButton'
import { LEGACYPRIME_ADMIN_ABI } from '../../abis/legacyPrimeAdmin'
import { useContracts } from '../../hooks/useLegacyPrime'
import { useTxAction } from '../../hooks/useTxAction'

// Field kinds → how the raw string is converted to a contract arg.
//  usdt: 18dp token amount (parseUnits) — also used for 1e18-scaled rates
//  int:  plain integer (bps / seconds / counts)
//  address: 0x-checked
export type AdminFieldKind = 'usdt' | 'int' | 'address'
export type AdminField = { key: string; label: string; kind: AdminFieldKind; placeholder?: string }

type Props = {
  title: string
  desc?: string
  icon?: LucideIcon
  functionName: string
  fields: AdminField[]
  explorer: string
  onDone: () => void
  danger?: boolean // destructive → red button + confirm dialog
  buttonLabel?: string
}

function convertField(kind: AdminFieldKind, raw: string): unknown | null {
  const s = raw.trim()
  if (!s) return null
  if (kind === 'address') return isAddress(s) ? (s as `0x${string}`) : null
  if (kind === 'usdt') {
    try {
      const n = Number(s)
      if (isNaN(n) || n < 0) return null
      return parseUnits(s, 18)
    } catch {
      return null
    }
  }
  // int
  if (!/^\d+$/.test(s)) return null
  return BigInt(s)
}

// One admin action = a titled card with N inputs and a TxButton. The page supplies the function name +
// field spec; this handles conversion (usdt→wei, int→bigint, address check), validation, and the tx.
export function AdminForm({ title, desc, icon, functionName, fields, explorer, onDone, danger, buttonLabel }: Props) {
  const tx = useTxAction()
  const { plan } = useContracts()
  const [vals, setVals] = useState<Record<string, string>>({})

  const converted = fields.map((f) => convertField(f.kind, vals[f.key] ?? ''))
  const canRun = !!plan && converted.every((c) => c !== null)

  const run = () => {
    if (danger && !window.confirm(`Confirm: ${title}?`)) return
    tx.run({
      address: plan as `0x${string}`,
      abi: LEGACYPRIME_ADMIN_ABI as Abi,
      functionName,
      args: converted as readonly unknown[],
    })
  }

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      {desc && <p className="mt-1 text-xs text-muted">{desc}</p>}

      <div className="mt-3 space-y-2">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-xs text-muted">{f.label}</label>
            <Input
              className={f.kind === 'address' ? 'font-mono' : ''}
              type={f.kind === 'int' || f.kind === 'usdt' ? 'text' : 'text'}
              inputMode={f.kind === 'address' ? 'text' : 'decimal'}
              placeholder={f.placeholder}
              value={vals[f.key] ?? ''}
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
              spellCheck={false}
            />
          </div>
        ))}
      </div>

      <TxButton
        tx={tx}
        canRun={canRun}
        idleLabel={buttonLabel ?? title}
        icon={icon}
        variant={danger ? 'outline' : 'primary'}
        explorerBase={explorer}
        onSuccess={() => {
          setVals({})
          onDone()
        }}
        className="mt-4"
        onRun={run}
      />
    </Card>
  )
}
