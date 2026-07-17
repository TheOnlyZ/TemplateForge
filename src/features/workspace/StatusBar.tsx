import { formatLength, type UnitSystem } from '../../domain/units/index.ts'
import type { LayoutStatus } from '../../domain/layout/index.ts'

function formatOrientation(orientation: string): string {
  if (orientation === 'portrait') return 'Portrait'
  if (orientation === 'landscape') return 'Landscape'
  return orientation.charAt(0).toUpperCase() + orientation.slice(1)
}

function getStatusLabel(status: LayoutStatus): string {
  if (status.type === 'single-piece') return 'Fits'
  if (status.type === 'multi-piece') return `${status.description ?? 'Multi-piece'}`
  return 'Blocked'
}

function getStatusVariant(status: LayoutStatus): string {
  if (status.errorCount > 0) return 'text-destructive'
  if (status.warningCount > 0) return 'text-warning'
  return 'text-text'
}

interface StatusBarProps {
  paperLabel: string
  orientationLabel: string
  printableWidthMm: number
  printableHeightMm: number
  unitSystem: UnitSystem
  layoutStatus: LayoutStatus
}

export function StatusBar({
  paperLabel,
  orientationLabel,
  printableWidthMm,
  printableHeightMm,
  unitSystem,
  layoutStatus,
}: StatusBarProps) {
  return (
    <footer className="flex h-8 items-center justify-between border-t border-border bg-surface px-4 text-xs text-text-muted">
      <div className="flex items-center gap-3">
        <span>{paperLabel}</span>
        <span className="h-3 w-px bg-border" />
        <span>{formatOrientation(orientationLabel)}</span>
        <span className="h-3 w-px bg-border" />
        <span>
          Printable: {formatLength(printableWidthMm, unitSystem)} ×{' '}
          {formatLength(printableHeightMm, unitSystem)}
        </span>
      </div>
      <div className={`flex items-center gap-1.5 font-medium ${getStatusVariant(layoutStatus)}`}>
        <span className={`inline-block h-1.5 w-1.5 rounded-full bg-current`} />
        <span>{getStatusLabel(layoutStatus)}</span>
      </div>
    </footer>
  )
}
