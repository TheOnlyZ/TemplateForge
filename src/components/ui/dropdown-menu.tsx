import { type ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../lib/utils.ts'

interface DropdownMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null)

function useDropdownMenuContext() {
  const ctx = useContext(DropdownMenuContext)
  if (!ctx) throw new Error('DropdownMenu components must be used within a DropdownMenu')
  return ctx
}

interface DropdownMenuProps {
  children?: ReactNode
}

function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)

  const value = useMemo(() => ({ open, setOpen }), [open])

  return (
    <DropdownMenuContext.Provider value={value}>
      {children}
    </DropdownMenuContext.Provider>
  )
}

interface DropdownMenuTriggerProps {
  children?: ReactNode
  className?: string
}

function DropdownMenuTrigger({ children, className }: DropdownMenuTriggerProps) {
  const { setOpen, open } = useDropdownMenuContext()

  return (
    <button
      type="button"
      className={cn('inline-flex items-center', className)}
      onClick={() => setOpen(!open)}
      aria-haspopup="menu"
      aria-expanded={open}
    >
      {children}
    </button>
  )
}

interface DropdownMenuContentProps {
  children?: ReactNode
  className?: string
  align?: 'start' | 'end'
}

function DropdownMenuContent({ children, className, align = 'start' }: DropdownMenuContentProps) {
  const { open, setOpen } = useDropdownMenuContext()
  const contentRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    triggerRef.current = document.querySelector('[aria-haspopup="menu"][aria-expanded="true"]')
  })

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, setOpen])

  if (!open) return null

  return (
    <div
      ref={contentRef}
      className={cn(
        'absolute z-50 min-w-[10rem] overflow-hidden rounded-md border border-border bg-popover p-1 shadow-md',
        align === 'end' ? 'right-0' : 'left-0',
        className,
      )}
      role="menu"
    >
      {children}
    </div>
  )
}

interface DropdownMenuItemProps {
  children?: ReactNode
  className?: string
  onSelect?: () => void
  disabled?: boolean
}

function DropdownMenuItem({ children, className, onSelect, disabled }: DropdownMenuItemProps) {
  const { setOpen } = useDropdownMenuContext()

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={cn(
        'relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text-h outline-none transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover disabled:pointer-events-none disabled:opacity-45',
        className,
      )}
      onClick={() => {
        if (!disabled) {
          setOpen(false)
          onSelect?.()
        }
      }}
      tabIndex={-1}
    >
      {children}
    </button>
  )
}

interface DropdownMenuSeparatorProps {
  className?: string
}

function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return (
    <div className={cn('-mx-1 my-1 h-px bg-border', className)} role="separator" />
  )
}

interface DropdownMenuLabelProps {
  children?: ReactNode
  className?: string
}

function DropdownMenuLabel({ children, className }: DropdownMenuLabelProps) {
  return (
    <div className={cn('px-2 py-1.5 text-xs font-medium text-text-muted', className)}>
      {children}
    </div>
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
}
