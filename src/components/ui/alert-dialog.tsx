import { createContext, useContext, useMemo, type ReactNode, useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils.ts'

interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
}

function AlertDialog({ open: controlledOpen, onOpenChange, children }: AlertDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  return (
    <AlertDialogContextProvider open={open} setOpen={setOpen}>
      {children}
    </AlertDialogContextProvider>
  )
}

interface AlertDialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null)

function AlertDialogContextProvider({
  open,
  setOpen,
  children,
}: AlertDialogContextValue & { children?: ReactNode }) {
  const value = useMemo(() => ({ open, setOpen }), [open, setOpen])
  return (
    <AlertDialogContext.Provider value={value}>
      {children}
    </AlertDialogContext.Provider>
  )
}

function useAlertDialogContext() {
  const ctx = useContext(AlertDialogContext)
  if (!ctx) throw new Error('AlertDialog components must be used within an AlertDialog')
  return ctx
}

interface AlertDialogTriggerProps {
  children?: ReactNode
  className?: string
  asChild?: boolean
}

function AlertDialogTrigger({ children, className }: AlertDialogTriggerProps) {
  const { setOpen } = useAlertDialogContext()

  return (
    <span
      className={cn('inline-flex', className)}
      onClick={() => setOpen(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setOpen(true)
        }
      }}
    >
      {children}
    </span>
  )
}

interface AlertDialogContentProps {
  children?: ReactNode
  className?: string
}

function AlertDialogContent({ children, className }: AlertDialogContentProps) {
  const { open, setOpen } = useAlertDialogContext()
  const contentRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      previousFocusRef.current?.focus()
      return
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    contentRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, setOpen])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        role="alertdialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          'relative z-50 w-full max-w-md rounded-lg border border-border bg-popover p-6 shadow-lg',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

interface AlertDialogHeaderProps {
  children?: ReactNode
  className?: string
}

function AlertDialogHeader({ children, className }: AlertDialogHeaderProps) {
  return (
    <div className={cn('mb-4 flex flex-col gap-1.5', className)}>
      {children}
    </div>
  )
}

interface AlertDialogTitleProps {
  children?: ReactNode
  className?: string
}

function AlertDialogTitle({ children, className }: AlertDialogTitleProps) {
  return (
    <h2 className={cn('text-lg font-semibold text-text-h', className)}>
      {children}
    </h2>
  )
}

interface AlertDialogDescriptionProps {
  children?: ReactNode
  className?: string
}

function AlertDialogDescription({ children, className }: AlertDialogDescriptionProps) {
  return (
    <p className={cn('text-sm text-text-muted', className)}>
      {children}
    </p>
  )
}

interface AlertDialogFooterProps {
  children?: ReactNode
  className?: string
}

function AlertDialogFooter({ children, className }: AlertDialogFooterProps) {
  return (
    <div className={cn('flex justify-end gap-2', className)}>
      {children}
    </div>
  )
}

interface AlertDialogActionProps {
  children?: ReactNode
  className?: string
  onClick?: () => void
}

function AlertDialogAction({ children, className, onClick }: AlertDialogActionProps) {
  const { setOpen } = useAlertDialogContext()

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors',
        'bg-accent-bg text-text-h border border-accent-border hover:bg-accent-bg/80',
        className,
      )}
      onClick={() => {
        onClick?.()
        setOpen(false)
      }}
    >
      {children}
    </button>
  )
}

interface AlertDialogCancelProps {
  children?: ReactNode
  className?: string
  onClick?: () => void
}

function AlertDialogCancel({ children, className, onClick }: AlertDialogCancelProps) {
  const { setOpen } = useAlertDialogContext()

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-text-h transition-colors hover:bg-surface-hover',
        className,
      )}
      onClick={() => {
        onClick?.()
        setOpen(false)
      }}
    >
      {children}
    </button>
  )
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
}
