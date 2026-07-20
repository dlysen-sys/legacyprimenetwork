import { useCallback } from 'react'
import { useChainId, useDisconnect, useSwitchChain } from 'wagmi'
import { LogOut, Loader2, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import {
  useContracts,
  useMember,
  useUsdt,
  useTokenBalance,
  useTxCooldown,
  useWithdrawCooldown,
  type Member,
} from '../../hooks/useLegacyPrime'
import { DEFAULT_CHAIN_ID, SUPPORTED_CHAIN_IDS } from '../../config/contracts'
import { shortAddr } from '../../lib/format'
import { RegisterGate } from '../../components/dashboard/RegisterGate'
import { StatusGrid } from '../../components/dashboard/StatusGrid'
import { DepositCard } from '../../components/dashboard/DepositCard'
import { ActivateCard } from '../../components/dashboard/ActivateCard'
import { ClaimCashbackCard } from '../../components/dashboard/ClaimCashbackCard'
import { ClaimTokenCard } from '../../components/dashboard/ClaimTokenCard'
import { WithdrawCard } from '../../components/dashboard/WithdrawCard'
import { SwapCard } from '../../components/dashboard/SwapCard'
import { GenealogyTree } from '../../components/dashboard/GenealogyTree'
import { OneLineTable } from '../../components/dashboard/OneLineTable'

// Registered-member console. Reads getUser() once, gates on `registered`, then exposes the plan's
// user functions (deposit / activate / claimCashBack / withdraw) + a ready swap link.
// Wired per references/sops/smart-contract-integration.md.
export function Dashboard() {
  const { user } = useAuth()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const { plan, usdt: usdtToken, explorer, configured } = useContracts()
  const { member: memberData, isLoading, refetch: refetchMember } = useMember()
  const usdt = useUsdt()
  const token = useTokenBalance()
  const cooldown = useTxCooldown()
  const withdrawCd = useWithdrawCooldown()

  const member = memberData as Member | undefined
  const onSupportedChain = SUPPORTED_CHAIN_IDS.includes(chainId as (typeof SUPPORTED_CHAIN_IDS)[number])

  // Refresh every read after any successful tx.
  const refresh = useCallback(() => {
    refetchMember()
    usdt.refetch()
    token.refetch()
    cooldown.refetch()
    withdrawCd.refetch()
  }, [refetchMember, usdt, token, cooldown, withdrawCd])

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Connected as <span className="font-mono text-fg">{shortAddr(user?.address)}</span>
          </p>
        </div>
        <Button variant="outline" onClick={() => disconnect()}>
          <LogOut size={16} /> Disconnect
        </Button>
      </header>

      <div className="mt-8">
        {!configured ? (
          <Notice
            title="Contract not wired yet"
            body="The LegacyPrime plan address isn't set for this network. Add VITE_LEGACYPRIME_ADDRESS to the app .env once the contract is deployed, then reload."
          />
        ) : !onSupportedChain ? (
          <Notice
            title="Wrong network"
            body="LegacyPrime runs on BNB Smart Chain. Switch networks to continue."
            action={
              <Button className="mt-4" onClick={() => switchChain({ chainId: DEFAULT_CHAIN_ID })}>
                Switch to BSC
              </Button>
            }
          />
        ) : isLoading && !member ? (
          <div className="flex items-center gap-2 py-16 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" /> Loading your account…
          </div>
        ) : !member?.registered ? (
          <RegisterGate plan={plan!} explorer={explorer} cooldown={cooldown} onDone={refresh} />
        ) : (
          <div className="space-y-6">
            <StatusGrid member={member} />

            <div className="grid gap-4 sm:grid-cols-2">
              <DepositCard
                plan={plan!}
                usdtToken={usdtToken!}
                explorer={explorer}
                balance={usdt.balance}
                allowance={usdt.allowance}
                cooldown={cooldown}
                onDone={refresh}
              />
              <ActivateCard
                plan={plan!}
                explorer={explorer}
                member={member}
                cooldown={cooldown}
                onDone={refresh}
              />
              <ClaimCashbackCard
                plan={plan!}
                explorer={explorer}
                member={member}
                cooldown={cooldown}
                onDone={refresh}
              />
              <ClaimTokenCard
                plan={plan!}
                explorer={explorer}
                tokenBalance={token.tokenBalance}
                productRate={token.productRate}
                cooldown={cooldown}
                onDone={refresh}
              />
              <WithdrawCard
                plan={plan!}
                explorer={explorer}
                member={member}
                cooldown={cooldown}
                withdrawCd={withdrawCd}
                onDone={refresh}
              />
              <SwapCard />
            </div>

            <GenealogyTree
              root={user!.address as `0x${string}`}
              summary={{
                active: member.active,
                activePackage: member.activePackage,
                directCount: member.directCount,
              }}
            />

            <OneLineTable you={user!.address as `0x${string}`} />
          </div>
        )}
      </div>
    </section>
  )
}

function Notice({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-fg">
        <AlertTriangle size={18} className="text-accent" />
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-muted">{body}</p>
      {action}
    </Card>
  )
}
