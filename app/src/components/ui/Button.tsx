import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'gold' | 'outline' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:brightness-110',
  gold: 'bg-accent text-accent-fg hover:brightness-105',
  outline: 'border border-border text-fg hover:bg-surface',
  ghost: 'text-fg hover:bg-surface',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
