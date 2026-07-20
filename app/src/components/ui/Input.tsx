import type { InputHTMLAttributes } from 'react'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-muted outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 ${className}`}
      {...props}
    />
  )
}
