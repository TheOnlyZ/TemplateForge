import { useId } from 'react'
import type { ReactNode, SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/utils.ts'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  children?: ReactNode
}

function Select({ label, id: externalId, children, className = '', ...rest }: SelectProps) {
  const autoId = useId()
  const selectId = externalId ?? autoId

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm text-text-muted" htmlFor={selectId}>
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className="w-full appearance-none rounded-md border border-border bg-surface-elevated px-3 py-2.5 pr-8 text-sm text-text-h transition-[border-color,box-shadow] focus:border-accent-border focus:shadow-[0_0_0_1px_var(--accent-border)] focus:outline-none"
          {...rest}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">
          &#9662;
        </span>
      </div>
    </div>
  )
}

export { Select }
export type { SelectProps }
