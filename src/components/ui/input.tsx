import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils.ts'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

function Input({ label, id: externalId, className = '', ...rest }: InputProps) {
  const autoId = useId()
  const inputId = externalId ?? autoId

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm text-text-muted" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className="rounded-md border border-border bg-surface-elevated px-3 py-2.5 text-sm text-text-h placeholder:text-text-muted transition-[border-color,box-shadow] focus:border-accent-border focus:shadow-[0_0_0_1px_var(--accent-border)] focus:outline-none"
        {...rest}
      />
    </div>
  )
}

export { Input }
export type { InputProps }
