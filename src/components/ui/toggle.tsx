import { type VariantProps, cva } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'

const toggleVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-surface-elevated text-text border border-border hover:bg-surface-hover hover:text-text-h data-[state=on]:bg-accent-bg data-[state=on]:text-text-h data-[state=on]:border-accent-border',
        outline:
          'border border-border bg-transparent text-text hover:bg-surface-hover hover:text-text-h data-[state=on]:bg-accent-bg data-[state=on]:text-text-h data-[state=on]:border-accent-border',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  },
)

interface ToggleProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof toggleVariants> {
  pressed?: boolean
  onPressedChange?: (pressed: boolean) => void
  children?: ReactNode
}

function Toggle({
  className,
  variant,
  size,
  pressed,
  onPressedChange,
  children,
  onClick,
  ...props
}: ToggleProps) {
  return (
    <button
      type="button"
      data-state={pressed ? 'on' : 'off'}
      className={cn(toggleVariants({ variant, size, className }))}
      aria-pressed={pressed}
      onClick={(e) => {
        onPressedChange?.(!pressed)
        onClick?.(e)
      }}
      {...props}
    >
      {children}
    </button>
  )
}

export { Toggle, toggleVariants }
export type { ToggleProps }
