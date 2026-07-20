import { useCallback, useEffect, useRef, useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import type { Abi } from 'viem'

const WAIT_MS = 60_000 // wait this long before offering Cancel / Keep waiting

export type TxPhase = 'idle' | 'signing' | 'pending' | 'success' | 'error'

export type TxConfig = {
  address: `0x${string}`
  abi: Abi
  functionName: string
  args?: readonly unknown[]
}

// One write lifecycle: idle → signing (wallet) → pending (mempool) → success | error.
// Wraps useWriteContract (sign+broadcast) and useWaitForTransactionReceipt (mining), adds a 60s soft
// timeout, and normalizes errors (user-rejected, on-chain revert). Mirrors the contract-integration SOP.
export function useTxAction() {
  const { writeContractAsync, reset: resetWrite } = useWriteContract()
  const [hash, setHash] = useState<`0x${string}` | undefined>(undefined)
  const [phase, setPhase] = useState<TxPhase>('idle')
  const [message, setMessage] = useState('')
  const [slow, setSlow] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: receipt, isError, error } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  })

  const stopTimer = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  const armTimer = useCallback(() => {
    stopTimer()
    setSlow(false)
    timer.current = setTimeout(() => setSlow(true), WAIT_MS)
  }, [])

  // Resolve once the receipt (or a fetch error) arrives.
  useEffect(() => {
    if (!hash) return
    if (receipt) {
      stopTimer()
      if (receipt.status === 'success') {
        setPhase('success')
        setMessage('Transaction confirmed.')
      } else {
        setPhase('error')
        setMessage('Transaction reverted on-chain.')
      }
    } else if (isError) {
      stopTimer()
      setPhase('error')
      setMessage(prettyError(error))
    }
  }, [receipt, isError, error, hash])

  useEffect(() => () => stopTimer(), [])

  const run = useCallback(
    async (config: TxConfig) => {
      setMessage('')
      setSlow(false)
      setPhase('signing')
      try {
        const h = await writeContractAsync(config as Parameters<typeof writeContractAsync>[0])
        setHash(h)
        setPhase('pending')
        armTimer()
      } catch (e) {
        stopTimer()
        setPhase('error')
        setMessage(prettyError(e))
      }
    },
    [writeContractAsync, armTimer],
  )

  const reset = useCallback(() => {
    stopTimer()
    setHash(undefined)
    setPhase('idle')
    setMessage('')
    setSlow(false)
    resetWrite()
  }, [resetWrite])

  const busy = phase === 'signing' || phase === 'pending'
  return { phase, busy, slow, message, hash, run, reset, keepWaiting: armTimer, cancel: reset }
}

export type TxAction = ReturnType<typeof useTxAction>

// One readable line from any viem/wagmi error.
function prettyError(e: unknown): string {
  if (!e) return 'Transaction failed.'
  const err = e as { name?: string; message?: string; shortMessage?: string }
  if (err.name === 'UserRejectedRequestError' || /reject|denied/i.test(err.message || ''))
    return 'You rejected the request in your wallet.'
  return err.shortMessage || err.message || 'Transaction failed.'
}
