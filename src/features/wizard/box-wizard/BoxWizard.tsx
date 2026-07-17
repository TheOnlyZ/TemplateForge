import { useEffect, useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../components/ui/accordion.tsx'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter as AlertDialogFooterRoot,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog.tsx'
import { Badge } from '../../../components/Badge.tsx'
import { Button } from '../../../components/Button.tsx'
import { Card, CardBody, CardHeader, CardTitle } from '../../../components/Card.tsx'
import { Input } from '../../../components/Input.tsx'
import { RadioGroup, RadioGroupItem } from '../../../components/ui/radio-group.tsx'
import { Select } from '../../../components/Select.tsx'
import { getMaterialOptions, type MaterialId } from '../../../domain/materials/index.ts'
import { getPaperSizeOptions } from '../../../domain/paper/index.ts'
import {
  formatEditableLength,
  getUnitSuffix,
  parseEditableLengthInput,
  type UnitSystem,
} from '../../../domain/units/index.ts'
import type { BoxStyle } from '../../../domain/shapes/box/index.ts'
import type { TemplateItem } from '../../../domain/templates/index.ts'
import type { ShapeType } from '../../../domain/shapes/shared/index.ts'
import { useAppStore } from '../../../store/app-store.ts'
import type { LayoutStatus } from '../../../domain/layout/index.ts'
import type { ValidationMessage } from '../../../domain/validation/index.ts'

const shapeOptions: { id: ShapeType; title: string }[] = [
  { id: 'box', title: 'Rectangular Box' },
  { id: 'cylinder', title: 'Straight Cylinder' },
]

const styleOptions: { id: BoxStyle; title: string }[] = [
  { id: 'glue-tab-carton', title: 'Glue Tab Carton' },
  { id: 'tuck-carton', title: 'Tuck Carton' },
  { id: 'open-tray', title: 'Open Tray' },
]

interface BoxWizardProps {
  unitSystem: UnitSystem
  previewTemplate: TemplateItem
  canExportPreviewPdf: boolean
  canExportPreviewSvg: boolean
  onExportPreviewPdf: () => void
  onExportPreviewSvg: () => void
  layoutStatus: LayoutStatus
  messages: ValidationMessage[]
}

export function BoxWizard({
  unitSystem,
  canExportPreviewPdf,
  canExportPreviewSvg,
  onExportPreviewPdf,
  onExportPreviewSvg,
  layoutStatus,
  messages,
}: BoxWizardProps) {
  const {
    addDraftToQueue,
    cancelEditingQueueItem,
    draft,
    editingQueueItemId,
    setDraftCylinderDimension,
    setDraftDimension,
    setDraftMargin,
    setDraftMaterialId,
    setDraftOrientation,
    setDraftPaperSizeId,
    setDraftShapeType,
    setDraftStyle,
    resetDraft,
  } = useAppStore()

  const isEditingQueueItem = editingQueueItemId !== null

  const [issuesOpen, setIssuesOpen] = useState(messages.length > 0)
  const [startOverOpen, setStartOverOpen] = useState(false)

  useEffect(() => {
    if (messages.length > 0) setIssuesOpen(true)
  }, [messages.length])

  function formatInputValue(valueMm: number) {
    return formatEditableLength(valueMm, unitSystem)
  }

  function parseInputValue(value: string) {
    return parseEditableLengthInput(Number(value), unitSystem)
  }

  const errorCount = layoutStatus.errorCount
  const warningCount = layoutStatus.warningCount

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shape Wizard</CardTitle>
        <span style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          {errorCount > 0 && (
            <Badge variant="accent" dot>{errorCount} error{errorCount !== 1 ? 's' : ''}</Badge>
          )}
          {errorCount === 0 && warningCount > 0 && (
            <Badge variant="warning" dot>{warningCount} warning{warningCount !== 1 ? 's' : ''}</Badge>
          )}
        </span>
      </CardHeader>
      <CardBody className="flex flex-col gap-0 p-0">
        <div className="px-4 pb-3 pt-4">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
            Shape
          </span>
          <RadioGroup
            value={draft.shapeType}
            onValueChange={(value) => setDraftShapeType(value as ShapeType)}
          >
            {shapeOptions.map((option) => (
              <RadioGroupItem key={option.id} value={option.id}>
                <strong className="text-sm font-medium">{option.title}</strong>
              </RadioGroupItem>
            ))}
          </RadioGroup>
        </div>

        <Accordion type="multiple" defaultValue={['dimensions', 'style', 'material']}>
          <AccordionItem value="dimensions">
            <AccordionTrigger>Dimensions</AccordionTrigger>
            <AccordionContent>
              {draft.shapeType === 'cylinder' ? (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label={`Diameter (${getUnitSuffix(unitSystem)})`}
                    type="number"
                    min={formatInputValue(12.7)}
                    max={formatInputValue(914.4)}
                    step={unitSystem === 'imperial' ? 0.01 : 1}
                    value={formatInputValue(draft.cylinderInput.diameterMm)}
                    onChange={(event) => setDraftCylinderDimension('diameterMm', parseInputValue(event.target.value))}
                  />
                  <Input
                    label={`Height (${getUnitSuffix(unitSystem)})`}
                    type="number"
                    min={formatInputValue(12.7)}
                    max={formatInputValue(914.4)}
                    step={unitSystem === 'imperial' ? 0.01 : 1}
                    value={formatInputValue(draft.cylinderInput.heightMm)}
                    onChange={(event) => setDraftCylinderDimension('heightMm', parseInputValue(event.target.value))}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label={`Length (${getUnitSuffix(unitSystem)})`}
                    type="number"
                    min={formatInputValue(12.7)}
                    max={formatInputValue(914.4)}
                    step={unitSystem === 'imperial' ? 0.01 : 1}
                    value={formatInputValue(draft.boxInput.externalLengthMm)}
                    onChange={(event) => setDraftDimension('externalLengthMm', parseInputValue(event.target.value))}
                  />
                  <Input
                    label={`Width (${getUnitSuffix(unitSystem)})`}
                    type="number"
                    min={formatInputValue(12.7)}
                    max={formatInputValue(914.4)}
                    step={unitSystem === 'imperial' ? 0.01 : 1}
                    value={formatInputValue(draft.boxInput.externalWidthMm)}
                    onChange={(event) => setDraftDimension('externalWidthMm', parseInputValue(event.target.value))}
                  />
                  <Input
                    label={`Height (${getUnitSuffix(unitSystem)})`}
                    type="number"
                    min={formatInputValue(12.7)}
                    max={formatInputValue(914.4)}
                    step={unitSystem === 'imperial' ? 0.01 : 1}
                    value={formatInputValue(draft.boxInput.externalHeightMm)}
                    onChange={(event) => setDraftDimension('externalHeightMm', parseInputValue(event.target.value))}
                  />
                  <Input
                    label={`Glue tab (${getUnitSuffix(unitSystem)})`}
                    type="number"
                    min={formatInputValue(6)}
                    max={formatInputValue(40)}
                    step={unitSystem === 'imperial' ? 0.01 : 1}
                    value={formatInputValue(draft.boxInput.glueTabWidthMm)}
                    onChange={(event) => setDraftDimension('glueTabWidthMm', parseInputValue(event.target.value))}
                  />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {draft.shapeType !== 'cylinder' && (
            <AccordionItem value="style">
              <AccordionTrigger>Style</AccordionTrigger>
              <AccordionContent>
                <RadioGroup
                  value={draft.boxInput.style}
                  onValueChange={(value) => setDraftStyle(value as BoxStyle)}
                >
                  {styleOptions.map((style) => (
                    <RadioGroupItem key={style.id} value={style.id}>
                      <strong className="text-sm font-medium">{style.title}</strong>
                    </RadioGroupItem>
                  ))}
                </RadioGroup>
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="material">
            <AccordionTrigger>Material</AccordionTrigger>
            <AccordionContent>
              <RadioGroup
                value={draft.materialId}
                onValueChange={(value) => setDraftMaterialId(value as MaterialId)}
              >
                {getMaterialOptions().map((material) => (
                  <RadioGroupItem key={material.id} value={material.id}>
                    <div className="flex flex-col gap-0.5">
                      <strong className="text-sm font-medium">{material.label}</strong>
                      <span className="text-xs text-text-muted">{material.description}</span>
                    </div>
                  </RadioGroupItem>
                ))}
              </RadioGroup>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="paper">
            <AccordionTrigger>Paper &amp; Margins</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Paper size"
                    value={draft.paperSizeId}
                    onChange={(event) => setDraftPaperSizeId(event.target.value as typeof draft.paperSizeId)}
                  >
                    {getPaperSizeOptions().map((paper) => (
                      <option key={paper.id} value={paper.id}>
                        {paper.label}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Orientation"
                    value={draft.orientation}
                    onChange={(event) => setDraftOrientation(event.target.value as typeof draft.orientation)}
                  >
                    <option value="auto">Auto</option>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['top', 'Top'],
                    ['right', 'Right'],
                    ['bottom', 'Bottom'],
                    ['left', 'Left'],
                  ] as const).map(([side, label]) => (
                    <Input
                      key={side}
                      label={`${label} margin (${getUnitSuffix(unitSystem)})`}
                      type="number"
                      min={formatInputValue(3)}
                      max={formatInputValue(25.4)}
                      step={unitSystem === 'imperial' ? 0.01 : 0.1}
                      value={formatInputValue(draft.margins[side])}
                      onChange={(event) => setDraftMargin(side, parseInputValue(event.target.value))}
                    />
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex flex-col gap-3 px-4 pb-4 pt-2">
          <div className={`layout-status layout-status--${layoutStatus.type}`}>
            <span className="layout-status__headline">
              <Badge variant={
                layoutStatus.type === 'single-piece' ? 'default' :
                layoutStatus.type === 'multi-piece' ? 'warning' : 'accent'
              } dot>
                {layoutStatus.type === 'single-piece' ? 'Fits' :
                 layoutStatus.type === 'multi-piece' ? 'Multi-piece' : 'Blocked'}
              </Badge>
            </span>
            <span className="layout-status__text">{layoutStatus.description}</span>
          </div>

          <div className="wizard-issues">
            <button
              type="button"
              className={`wizard-issues__toggle${issuesOpen ? ' wizard-issues__toggle--open' : ''}`}
              onClick={() => setIssuesOpen((v) => !v)}
            >
              <span>Issues</span>
              {messages.length === 0 ? (
                <span className="wizard-issues__count wizard-issues__count--ok">✓ No issues</span>
              ) : (
                <span className="wizard-issues__count wizard-issues__count--problems">
                  {messages.filter(m => m.severity === 'error').length > 0
                    ? `${messages.filter(m => m.severity === 'error').length} error${messages.filter(m => m.severity === 'error').length !== 1 ? 's' : ''}`
                    : `${messages.filter(m => m.severity === 'warning').length} warning${messages.filter(m => m.severity === 'warning').length !== 1 ? 's' : ''}`}
                  <span className="wizard-issues__arrow">{issuesOpen ? '▾' : '▸'}</span>
                </span>
              )}
            </button>
            {issuesOpen && messages.length > 0 && (
              <ul className="wizard-issues__list">
                {messages.map((message) => (
                  <li key={message.code + message.message} className="wizard-issues__item">
                    <Badge variant={message.severity === 'warning' ? 'warning' : 'accent'} dot>{message.severity}</Badge>
                    <span className="wizard-issues__text">{message.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onExportPreviewPdf} disabled={!canExportPreviewPdf} title={!canExportPreviewPdf ? layoutStatus.description : ''}>
              PDF
            </Button>
            <Button onClick={onExportPreviewSvg} disabled={!canExportPreviewSvg} title={!canExportPreviewSvg ? layoutStatus.description : ''}>
              SVG
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Button onClick={() => addDraftToQueue()} disabled={!canExportPreviewPdf} title={!canExportPreviewPdf ? layoutStatus.description : ''}>
                {isEditingQueueItem ? 'Save Changes' : 'Add to Queue'}
              </Button>
              {isEditingQueueItem && (
                <Button variant="ghost" onClick={() => cancelEditingQueueItem()}>
                  Cancel
                </Button>
              )}
              <Button variant="ghost" onClick={() => setStartOverOpen(true)}>
                Start Over
              </Button>
              <AlertDialog open={startOverOpen} onOpenChange={setStartOverOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Start over</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset the current draft. Items already in the queue will be preserved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooterRoot>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => resetDraft()}>Start Over</AlertDialogAction>
                  </AlertDialogFooterRoot>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
