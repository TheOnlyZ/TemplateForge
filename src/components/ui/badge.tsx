import type { ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'

interface BadgeProps {
  variant?: 'default' | 'accent' | 'warning'
  dot?: boolean
  children?: ReactNode
  className?: string
}

function Badge({ variant = 'default', dot: showDot, children, className = '' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs whitespace-nowrap',
        variant === 'default' && 'border border-border bg-surface-elevated text-text',
        variant === 'accent' && 'border border-accent-border bg-accent-bg text-text-h',
        variant === 'warning' && 'border border-[rgba(232,168,76,0.35)] bg-[rgba(232,168,76,0.15)] text-warning',
        className,
      )}
    >
      {showDot && <span className="inline-block size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export { Badge }
export type { BadgeProps }
