import type { ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'

interface ToggleGroupProps {
  value: string
  onValueChange: (value: string) => void
  children?: ReactNode
  className?: string
}

function ToggleGroupRoot({ children, className }: ToggleGroupProps) {
  return (
    <div
      className={cn('inline-flex items-center rounded-md border border-border bg-surface-elevated p-0.5', className)}
      role="radiogroup"
    >
      {children}
    </div>
  )
}

interface ToggleGroupItemProps {
  value: string
  selectedValue?: string
  onSelect?: (value: string) => void
  children?: ReactNode
  className?: string
}

function ToggleGroupItem({ value, selectedValue, onSelect, children, className }: ToggleGroupItemProps) {
  const isSelected = value === selectedValue

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      data-state={isSelected ? 'on' : 'off'}
      className={cn(
        'inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isSelected
          ? 'bg-surface text-text-h shadow-sm'
          : 'text-text-muted hover:text-text-h',
        className,
      )}
      onClick={() => onSelect?.(value)}
    >
      {children}
    </button>
  )
}

export { ToggleGroupRoot, ToggleGroupItem }
export type { ToggleGroupProps, ToggleGroupItemProps }
