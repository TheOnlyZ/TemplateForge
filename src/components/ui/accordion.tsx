import * as AccordionPrimitive from '@radix-ui/react-accordion'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'

interface AccordionProps {
  type: 'single' | 'multiple'
  defaultValue?: string[]
  value?: string[]
  onValueChange?: (value: string[]) => void
  collapsible?: boolean
  children?: ReactNode
  className?: string
}

function Accordion({ type, defaultValue, value, onValueChange, collapsible, children, className }: AccordionProps) {
  return (
    <AccordionPrimitive.Root
      type={type}
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      collapsible={collapsible}
      className={cn('flex flex-col gap-1', className)}
      {...({} as any)}
    >
      {children}
    </AccordionPrimitive.Root>
  )
}

interface AccordionItemProps {
  value: string
  children?: ReactNode
  className?: string
}

function AccordionItem({ value, children, className }: AccordionItemProps) {
  return (
    <AccordionPrimitive.Item
      value={value}
      className={cn('rounded-md border border-border', className)}
    >
      {children}
    </AccordionPrimitive.Item>
  )
}

interface AccordionTriggerProps {
  children?: ReactNode
  className?: string
}

function AccordionTrigger({ children, className }: AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          'flex flex-1 items-center justify-between px-4 py-2.5 text-sm font-medium text-text-h transition-colors hover:bg-surface-hover [&[data-state=open]>svg]:rotate-180',
          className,
        )}
      >
        {children}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-text-muted transition-transform duration-200"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

interface AccordionContentProps {
  children?: ReactNode
  className?: string}
function AccordionContent({ children, className }: AccordionContentProps) {
  return (
    <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:h-0">
      <div className={cn('px-4 pb-4 pt-1', className)}>
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
