import { useEffect, useState } from 'react'

// Generic live countdown from an on-chain (lastTime, cooldown) pair — both unix seconds as bigint.
// Returns { active, remaining } and re-renders each second while active. Used for the 9s anti-spam
// gate and the 24h withdraw cooldown so the button disables + counts down instead of reverting.
export function useCooldown(lastTime?: bigint, cooldown?: bigint) {
  const target = lastTime !== undefined && cooldown !== undefined ? Number(lastTime + cooldown) : 0
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    if (!target) return
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(t)
  }, [target])

  const remaining = target ? Math.max(0, target - now) : 0
  return { active: remaining > 0, remaining }
}

/** Format a seconds count as a short human string: "9s", "4m 12s", "23h 5m". */
export function formatCooldown(secs: number): string {
  if (secs <= 0) return ''
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h) return `${h}h ${m}m`
  if (m) return `${m}m ${s}s`
  return `${s}s`
}
