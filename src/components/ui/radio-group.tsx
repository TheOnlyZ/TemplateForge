import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'

interface RadioGroupProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children?: ReactNode
  className?: string
}

function RadioGroup({ value, defaultValue, onValueChange, children, className }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive.Root
      value={value ?? null}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      className={cn('flex flex-col gap-2', className)}
      {...({} as any)}
    >
      {children}
    </RadioGroupPrimitive.Root>
  )
}

interface RadioGroupItemProps {
  value: string
  id?: string
  children?: ReactNode
  className?: string
}

function RadioGroupItem({ value, id, children, className }: RadioGroupItemProps) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      id={id}
      className={cn(
        'group flex w-full cursor-pointer items-start gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'border-border bg-surface-elevated text-text-h hover:bg-surface-hover',
        'data-[state=checked]:border-accent-border data-[state=checked]:bg-accent-bg',
        className,
      )}
    >
      {children}
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
export type { RadioGroupProps, RadioGroupItemProps }
