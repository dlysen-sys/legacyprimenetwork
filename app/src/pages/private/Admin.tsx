import { useCallback, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useChainId } from 'wagmi'
import { ShieldAlert, Coins, SlidersHorizontal, Banknote, Droplets, UserCog, type LucideIcon } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { useContracts } from '../../hooks/useLegacyPrime'
import { useIsAdmin } from '../../hooks/useAdmin'
import { SUPPORTED_CHAIN_IDS } from '../../config/contracts'
import { shortAddr } from '../../lib/format'
import { AdminStatus } from '../../components/admin/AdminStatus'
import { PauseControl } from '../../components/admin/PauseControl'
import { AdminForm, type AdminField } from '../../components/admin/AdminForm'

type ActionSpec = {
  fn: string
  title: string
  desc?: string
  fields: AdminField[]
  danger?: boolean
  buttonLabel?: string
}

const PARAMS: ActionSpec[] = [
  {
    fn: 'setSystemFee', title: 'System fee', desc: 'Flat USDT carved from each withdrawal fee → system wallet.',
    fields: [
      { key: 'fee', label: 'Fee (USDT)', kind: 'usdt', placeholder: 'e.g. 1' },
      { key: 'wallet', label: 'System wallet', kind: 'address', placeholder: '0x…' },
    ],
  },
  {
    fn: 'setWithdrawParams', title: 'Withdraw params', desc: 'Processing fee (bps), cooldown (seconds), minimum.',
    fields: [
      { key: 'feeBps', label: 'Fee (bps, ≤3000)', kind: 'int', placeholder: '1000 = 10%' },
      { key: 'cooldown', label: 'Cooldown (seconds)', kind: 'int', placeholder: '86400 = 24h' },
      { key: 'min', label: 'Min withdraw (USDT)', kind: 'usdt', placeholder: 'e.g. 10' },
    ],
  },
  {
    fn: 'setProductRate', title: 'Product rate', desc: 'LPNT delivered per 1 USDT of product allocation.',
    fields: [{ key: 'rate', label: 'Rate (LPNT per USDT)', kind: 'usdt', placeholder: 'e.g. 1' }],
  },
  {
    fn: 'setCashBackClaimBps', title: 'Cashback claim size', desc: '% of the active tier paid per claimCashBack.',
    fields: [{ key: 'bps', label: 'Bps (≤10000)', kind: 'int', placeholder: '2000 = 20%' }],
  },
  {
    fn: 'setCapBps', title: 'Earnings cap', desc: 'Cap top-up per activation, as % of the tier.',
    fields: [{ key: 'bps', label: 'Bps (10000–100000)', kind: 'int', placeholder: '40000 = 400%' }],
  },
]

const POOLS: ActionSpec[] = [
  { fn: 'withdrawIncentive', title: 'Withdraw incentive', fields: wa() },
  { fn: 'withdrawLiquidity', title: 'Withdraw liquidity', fields: wa() },
  { fn: 'withdrawProfit', title: 'Withdraw profit', fields: wa() },
  { fn: 'withdrawProduct', title: 'Withdraw product', fields: wa() },
  { fn: 'withdrawFees', title: 'Withdraw fees', fields: wa() },
  { fn: 'withdrawLpnt', title: 'Withdraw LPNT', desc: 'Send LPNT (incl. reserve) out.', fields: wa('LPNT') },
  { fn: 'withdrawTreasury', title: 'Withdraw treasury', desc: '⚠ Drains raw USDT — bypasses pool accounting.', danger: true, fields: wa() },
]

const LIQUIDITY: ActionSpec[] = [
  { fn: 'setLiquidity', title: 'Set LP manager', fields: [{ key: 'manager', label: 'Manager address', kind: 'address', placeholder: '0x…' }] },
  { fn: 'setLiquiditySlippageBps', title: 'LP slippage', fields: [{ key: 'bps', label: 'Bps (≤5000)', kind: 'int', placeholder: '500 = 5%' }] },
  { fn: 'flushLiquidity', title: 'Flush liquidity', desc: 'Retry routing retained liquidity to the LP manager.', fields: [{ key: 'amount', label: 'Amount (USDT)', kind: 'usdt', placeholder: 'e.g. 100' }] },
]

const ACCESS: ActionSpec[] = [
  { fn: 'addAdmin', title: 'Add admin', fields: [{ key: 'a', label: 'Address', kind: 'address', placeholder: '0x…' }] },
  { fn: 'removeAdmin', title: 'Remove admin', danger: true, fields: [{ key: 'a', label: 'Address', kind: 'address', placeholder: '0x…' }] },
  { fn: 'transferOwnership', title: 'Transfer ownership', desc: '⚠ Hands the contract to a new owner.', danger: true, fields: [{ key: 'a', label: 'New owner', kind: 'address', placeholder: '0x…' }] },
]

// helper: a `to` + `amount` withdraw form spec
function wa(unit = 'USDT'): AdminField[] {
  return [
    { key: 'to', label: 'To', kind: 'address', placeholder: '0x…' },
    { key: 'amount', label: `Amount (${unit})`, kind: 'usdt', placeholder: 'e.g. 100' },
  ]
}

// Owner-only console for the LegacyPrime admin surface. Gated on owner() == connected wallet.
export function Admin() {
  const qc = useQueryClient()
  const chainId = useChainId()
  const { plan, explorer, configured } = useContracts()
  const { isOwner, owner, isLoading } = useIsAdmin()
  const onSupportedChain = SUPPORTED_CHAIN_IDS.includes(chainId as (typeof SUPPORTED_CHAIN_IDS)[number])

  const refresh = useCallback(() => {
    qc.invalidateQueries()
  }, [qc])

  const renderGroup = (specs: ActionSpec[], icon?: LucideIcon) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {specs.map((s) => (
        <AdminForm
          key={s.fn + s.title}
          title={s.title}
          desc={s.desc}
          fields={s.fields}
          functionName={s.fn}
          danger={s.danger}
          explorer={explorer}
          onDone={refresh}
          icon={icon}
        />
      ))}
    </div>
  )

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center gap-2">
        <ShieldAlert size={22} className="text-primary" />
        <h1 className="text-2xl font-bold text-fg">Admin</h1>
      </div>
      <p className="mt-1 text-sm text-muted">Owner console — protocol parameters, pools, and access control.</p>

      <div className="mt-8">
        {!configured ? (
          <Notice title="Contract not wired" body="Set VITE_LEGACYPRIME_ADDRESS for this network." />
        ) : !onSupportedChain ? (
          <Notice title="Wrong network" body="Switch to a supported network (BSC / local)." />
        ) : isLoading ? (
          <p className="py-16 text-sm text-muted">Checking owner…</p>
        ) : !isOwner ? (
          <Notice
            title="Owner only"
            body={`This console is restricted to the contract owner${owner ? ` (${shortAddr(owner)})` : ''}. Connect the owner wallet to manage the protocol.`}
          />
        ) : (
          <div className="space-y-8">
            <AdminStatus onRefresh={refresh} />

            <Section title="Emergency" icon={ShieldAlert}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <PauseControl explorer={explorer} onDone={refresh} />
              </div>
            </Section>

            <Section title="Fees & parameters" icon={SlidersHorizontal}>{renderGroup(PARAMS, Coins)}</Section>
            <Section title="Pool withdrawals" icon={Banknote}>{renderGroup(POOLS, Banknote)}</Section>
            <Section title="Liquidity" icon={Droplets}>{renderGroup(LIQUIDITY, Droplets)}</Section>
            <Section title="Access control (owner-only)" icon={UserCog}>{renderGroup(ACCESS, UserCog)}</Section>
          </div>
        )}
      </div>

      {/* plan address footer */}
      {plan && isOwner && (
        <p className="mt-8 text-center font-mono text-xs text-muted">Plan: {plan}</p>
      )}
    </section>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
        <Icon size={15} /> {title}
      </h2>
      {children}
    </div>
  )
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-fg">
        <ShieldAlert size={18} className="text-accent" />
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </Card>
  )
}
