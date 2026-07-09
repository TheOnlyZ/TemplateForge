import { Badge } from '../../components/Badge.tsx'
import { Button } from '../../components/Button.tsx'
import { Card } from '../../components/Card.tsx'
import { getMaterialDefinition } from '../../domain/materials/index.ts'
import { formatLength, type UnitSystem } from '../../domain/units/index.ts'
import type { BoxQueueItem } from '../../store/app-store.ts'
import styles from './QueueSection.module.css'

interface QueueSectionProps {
  queueItems: BoxQueueItem[]
  editingQueueItemId: string | null
  unitSystem: UnitSystem
  onExportBatchPdf: () => void
  onExportItemPdf: (itemId: string) => void
  onExportItemSvg: (itemId: string) => void
  onEditItem: (itemId: string) => void
  onDuplicateItem: (itemId: string) => void
  onRemoveItem: (itemId: string) => void
  exportableCount: number
  buildItemPreview: (item: BoxQueueItem) => {
    validation: { messages: Array<{ severity: string }> }
    shapeValidation: { messages: Array<{ severity: string }> }
    paper: { label: string }
    layout: { pages: Array<{ orientation?: string }> }
    template: { parts: Array<{ bounds: { width: number } }>; shapeType: string; name: string }
  }
}

function getStyleLabel(style: string) {
  if (style === 'open-tray') return 'Open Tray'
  if (style === 'glue-tab-carton') return 'Glue Tab Carton'
  if (style === 'cylinder') return 'Straight Cylinder'
  return 'Tuck Carton'
}

export function QueueSection({
  queueItems,
  editingQueueItemId,
  unitSystem,
  onExportBatchPdf,
  onExportItemPdf,
  onExportItemSvg,
  onEditItem,
  onDuplicateItem,
  onRemoveItem,
  exportableCount,
  buildItemPreview,
}: QueueSectionProps) {
  const headerNode = (
    <>
      <span>Project Queue</span>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Badge>{queueItems.length} item{queueItems.length !== 1 ? 's' : ''}</Badge>
        {queueItems.length > 0 && (
          <Button size="sm" onClick={onExportBatchPdf} disabled={exportableCount === 0}>
            Batch PDF
          </Button>
        )}
      </div>
    </>
  )

  return (
    <Card header={headerNode}>
      {queueItems.length === 0 ? (
        <div className={styles.empty}>
          <strong>No queued templates yet</strong>
          <p>Complete the wizard and add an item to the queue to start building a printable project.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {queueItems.map((item) => {
            const itemResult = buildItemPreview(item)
            const itemMaterial = getMaterialDefinition(item.materialId)
            const canExportItemSvg = !itemResult.shapeValidation.messages.some((m) => m.severity === 'error')
            const canExportItemPdf = !itemResult.validation.messages.some((m) => m.severity === 'error')

            return (
              <li key={item.id} className={styles.item}>
                <div className={styles.itemHeader}>
                  <div>
                    <strong className={styles.itemName}>{item.name}</strong>
                    <p className={styles.itemMaterial}>{itemMaterial.label}</p>
                  </div>
                  <Badge variant="accent">
                    {item.shapeType === 'cylinder' ? 'Straight Cylinder' : getStyleLabel(item.boxInput.style)}
                  </Badge>
                </div>
                <div className={styles.meta}>
                  {item.shapeType === 'cylinder' ? (
                    <>
                      <span className={styles.metaChip}>{formatLength(item.cylinderInput.diameterMm, unitSystem)} dia</span>
                      <span className={styles.metaChip}>{formatLength(item.cylinderInput.heightMm, unitSystem)} H</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.metaChip}>{formatLength(item.boxInput.externalLengthMm, unitSystem)} L</span>
                      <span className={styles.metaChip}>{formatLength(item.boxInput.externalWidthMm, unitSystem)} W</span>
                      <span className={styles.metaChip}>{formatLength(item.boxInput.externalHeightMm, unitSystem)} H</span>
                    </>
                  )}
                  <span className={styles.metaChip}>{itemResult.paper.label}</span>
                  <span className={styles.metaChip}>
                    {formatLength(itemResult.template.parts[0]!.bounds.width, unitSystem)} W
                  </span>
                </div>
                <div className={styles.actions}>
                  <Button size="sm" onClick={() => onExportItemPdf(item.id)} disabled={!canExportItemPdf}>
                    PDF
                  </Button>
                  <Button size="sm" onClick={() => onExportItemSvg(item.id)} disabled={!canExportItemSvg}>
                    SVG
                  </Button>
                  <Button size="sm" onClick={() => onEditItem(item.id)} disabled={editingQueueItemId === item.id}>
                    {editingQueueItemId === item.id ? 'Editing' : 'Edit'}
                  </Button>
                  <Button size="sm" onClick={() => onDuplicateItem(item.id)}>
                    Dup
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onRemoveItem(item.id)}>
                    Remove
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
