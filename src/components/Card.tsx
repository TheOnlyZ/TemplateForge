import type { ReactNode } from 'react'
import { cn } from '../lib/utils.ts'

interface CardProps {
  variant?: 'flat' | 'elevated'
  header?: ReactNode
  children?: ReactNode
  className?: string
}

export function Card({ variant, header, children, className = '' }: CardProps) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border border-border bg-surface shadow-sm transition-shadow',
        variant === 'elevated' && 'bg-surface-elevated',
        className,
      )}
    >
      {header && (
        <div
          className={cn(
            'flex items-center justify-between gap-3 overflow-hidden px-5 pt-5',
            '[&>:last-child]:shrink-0',
          )}
        >
          <h3 className="m-0 text-lg text-text-h">{header}</h3>
        </div>
      )}
      {children && <div className="flex flex-col px-5 py-5">{children}</div>}
    </div>
  )
}
