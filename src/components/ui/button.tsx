import { type VariantProps, cva } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-accent-bg text-text-h border border-accent-border hover:bg-accent-bg/80',
        secondary:
          'bg-surface-elevated text-text-h border border-border hover:bg-surface-hover',
        ghost: 'bg-transparent text-text-h border border-transparent hover:bg-surface-hover',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        small: 'h-8 px-3 text-xs',
        regular: 'h-10 px-4 text-sm',
        large: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  },
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children?: ReactNode
}

function Button({ className, variant, size, children, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} {...props}>
      {children}
    </button>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
