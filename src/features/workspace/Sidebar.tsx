import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu.tsx'
import type { BoxQueueItem } from '../../store/app-store.ts'
import { useAppStore } from '../../store/app-store.ts'
import { formatLength, type UnitSystem } from '../../domain/units/index.ts'

function getShapeLabel(shapeType: string, style: string): string {
  if (shapeType === 'cylinder') return 'Straight Cylinder'
  if (style === 'open-tray') return 'Open Tray'
  if (style === 'glue-tab-carton') return 'Glue Tab Carton'
  if (style === 'tuck-carton') return 'Tuck Carton'
  return 'Box'
}

interface SidebarProps {
  unitSystem: UnitSystem
  editingQueueItemId: string | null
  onExportItemPdf: (itemId: string) => void
  onExportItemSvg: (itemId: string) => void
  onExportBatchPdf: () => void
  exportableCount: number
  buildItemPreview: (item: BoxQueueItem) => {
    validation: { messages: Array<{ severity: string }> }
    shapeValidation: { messages: Array<{ severity: string }> }
    paper: { label: string }
    layout: { pages: Array<{ orientation?: string }> }
    template: { parts: Array<{ bounds: { width: number } }>; shapeType: string; name: string }
  }
}

export function Sidebar({
  unitSystem,
  editingQueueItemId,
  onExportItemPdf,
  onExportItemSvg,
  onExportBatchPdf,
  exportableCount,
  buildItemPreview,
}: SidebarProps) {
  const queueItems = useAppStore((s) => s.queueItems)
  const startEditingQueueItem = useAppStore((s) => s.startEditingQueueItem)
  const duplicateQueueItem = useAppStore((s) => s.duplicateQueueItem)
  const removeQueueItem = useAppStore((s) => s.removeQueueItem)
  const resetDraft = useAppStore((s) => s.resetDraft)

  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null)
  const removeTarget = removeTargetId ? queueItems.find((i) => i.id === removeTargetId) : null

  return (
    <aside className="flex h-full flex-col border-r border-border bg-surface">
      <div className="p-3">
        <button
          type="button"
          onClick={() => resetDraft()}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-accent-border bg-accent-bg px-3 py-2 text-sm font-medium text-text-h transition-colors hover:bg-accent-bg/80"
        >
          + New Template
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Queue ({queueItems.length})
        </span>
        {queueItems.length > 0 && (
          <button
            type="button"
            onClick={onExportBatchPdf}
            disabled={exportableCount === 0}
            className="text-xs text-text-muted transition-colors hover:text-text-h disabled:opacity-45"
          >
            Batch PDF
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {queueItems.length === 0 ? (
          <p className="mt-4 text-center text-xs text-text-muted">
            No queued templates yet.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {queueItems.map((item) => {
              const isEditing = editingQueueItemId === item.id
              const itemResult = buildItemPreview(item)
              const canExportPdf = !itemResult.validation.messages.some((m) => m.severity === 'error')
              const canExportSvg = !itemResult.shapeValidation.messages.some((m) => m.severity === 'error')

              const dims = item.shapeType === 'cylinder'
                ? `${formatLength(item.cylinderInput.diameterMm, unitSystem)} dia × ${formatLength(item.cylinderInput.heightMm, unitSystem)} H`
                : `${formatLength(item.boxInput.externalLengthMm, unitSystem)} × ${formatLength(item.boxInput.externalWidthMm, unitSystem)} × ${formatLength(item.boxInput.externalHeightMm, unitSystem)}`

              const shapeLabel = getShapeLabel(item.shapeType, item.boxInput.style)

              return (
                <div key={item.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => startEditingQueueItem(item.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                      isEditing
                        ? 'border-accent-border bg-accent-bg'
                        : 'border-transparent hover:bg-surface-hover'
                    }`}
                  >
                    <div className="truncate text-sm font-medium text-text-h">
                      {item.name}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-text-muted">
                      {dims}
                    </div>
                    <div className="mt-0.5 text-xs text-text-muted">
                      {shapeLabel} · {itemResult.paper.label}
                    </div>
                  </button>

                  <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover hover:text-text-h">
                        ⋯
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => startEditingQueueItem(item.id)}
                          disabled={isEditing}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => onExportItemPdf(item.id)}
                          disabled={!canExportPdf}
                        >
                          Export PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => onExportItemSvg(item.id)}
                          disabled={!canExportSvg}
                        >
                          Export SVG
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => duplicateQueueItem(item.id)}
                        >
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setRemoveTargetId(item.id)}
                        >
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => { if (!open) setRemoveTargetId(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{removeTarget?.name}" from the queue? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (removeTargetId) removeQueueItem(removeTargetId)
              setRemoveTargetId(null)
            }}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}
