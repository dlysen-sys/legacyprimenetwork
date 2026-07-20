import { useId } from 'react'

type LogoProps = { size?: number; withWord?: boolean; className?: string }

// LegacyPrime mark: a rounded-square purple badge with a gold LP monogram built from
// geometric strokes (L = angle, P = stem + bowl). The badge is self-contained, so it stays
// legible on both light and dark backgrounds. useId keeps the gradient ids unique per instance.
export function Logo({ size = 32, withWord = true, className = '' }: LogoProps) {
  const uid = useId()
  const badge = `lp-badge-${uid}`
  const gold = `lp-gold-${uid}`

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label="LegacyPrime">
        <defs>
          <linearGradient id={badge} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B5CF6" />
            <stop offset="0.55" stopColor="#7C3AED" />
            <stop offset="1" stopColor="#4C1D95" />
          </linearGradient>
          <linearGradient id={gold} x1="18" y1="14" x2="44" y2="50" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FDE68A" />
            <stop offset="0.5" stopColor="#F6C445" />
            <stop offset="1" stopColor="#DF9C08" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="58" height="58" rx="16" fill={`url(#${badge})`} />
        <rect x="3.75" y="3.75" width="56.5" height="56.5" rx="15.25" fill="none" stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="1.5" />
        <g stroke={`url(#${gold})`} strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M20 16V48H38" />
          <path d="M33 48V16a9 7.5 0 0 1 0 15" />
        </g>
      </svg>
      {withWord && (
        <span className="font-bold tracking-tight text-fg hidden lg:block">
          Legacy<span className="text-accent">Prime</span>
        </span>
      )}
    </span>
  )
}
