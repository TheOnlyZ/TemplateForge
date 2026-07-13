import { Badge } from '../../../components/Badge.tsx'
import { Button } from '../../../components/Button.tsx'
import { Card } from '../../../components/Card.tsx'
import { Input } from '../../../components/Input.tsx'
import { Select } from '../../../components/Select.tsx'
import { Stepper } from '../../../components/Stepper.tsx'
import { getMaterialDefinition, getMaterialOptions } from '../../../domain/materials/index.ts'
import { getPaperSizeOptions } from '../../../domain/paper/index.ts'
import type { TemplateItem } from '../../../domain/templates/index.ts'
import {
  formatEditableLength,
  getUnitSuffix,
  parseEditableLengthInput,
  type UnitSystem,
} from '../../../domain/units/index.ts'
import type { BoxStyle } from '../../../domain/shapes/box/index.ts'
import type { ShapeType } from '../../../domain/shapes/shared/index.ts'
import { useAppStore, type BoxWizardStepId } from '../../../store/app-store.ts'
import type { LayoutStatus } from '../../../domain/layout/index.ts'
import type { ValidationMessage } from '../../../domain/validation/index.ts'
import { useEffect, useRef, useState } from 'react'

const steps: { id: BoxWizardStepId; label: string }[] = [
  { id: 'shape', label: 'Shape' },
  { id: 'dimensions', label: 'Dimensions' },
  { id: 'style', label: 'Style' },
  { id: 'material', label: 'Material' },
  { id: 'paper', label: 'Paper' },
  { id: 'preview', label: 'Preview' },
]

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
  previewTemplate,
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
    draftStep,
    editingQueueItemId,
    nextDraftStep,
    previousDraftStep,
    resetDraft,
    setDraftCylinderDimension,
    setDraftDimension,
    setDraftMargin,
    setDraftMaterialId,
    setDraftName,
    setDraftOrientation,
    setDraftPaperSizeId,
    setDraftShapeType,
    setDraftStep,
    setDraftStyle,
  } = useAppStore()

  const stepIndex = steps.findIndex((step) => step.id === draftStep)
  const activeMaterial = getMaterialDefinition(draft.materialId)
  const isEditingQueueItem = editingQueueItemId !== null
  const showLayoutStatus = stepIndex > 0

  const [issuesOpen, setIssuesOpen] = useState(messages.length > 0)
  const prevShapeType = useRef(draft.shapeType)
  const prevStyle = useRef(draft.boxInput.style)
  const prevMaterialId = useRef(draft.materialId)

  useEffect(() => {
    if (messages.length > 0) setIssuesOpen(true)
  }, [messages.length])

  useEffect(() => {
    if (draftStep !== 'shape') return
    if (draft.shapeType === prevShapeType.current) return
    prevShapeType.current = draft.shapeType
    const timer = setTimeout(() => nextDraftStep(), 300)
    return () => clearTimeout(timer)
  }, [draft.shapeType, draftStep])

  useEffect(() => {
    if (draftStep !== 'style') return
    if (draft.boxInput.style === prevStyle.current) return
    prevStyle.current = draft.boxInput.style
    const timer = setTimeout(() => nextDraftStep(), 300)
    return () => clearTimeout(timer)
  }, [draft.boxInput.style, draftStep])

  useEffect(() => {
    if (draftStep !== 'material') return
    if (draft.materialId === prevMaterialId.current) return
    prevMaterialId.current = draft.materialId
    const timer = setTimeout(() => nextDraftStep(), 300)
    return () => clearTimeout(timer)
  }, [draft.materialId, draftStep])

  function formatInputValue(valueMm: number) {
    return formatEditableLength(valueMm, unitSystem)
  }

  function parseInputValue(value: string) {
    return parseEditableLengthInput(Number(value), unitSystem)
  }

  const headerNode = (
    <>
      <span>Shape Wizard</span>
      <span style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
        {layoutStatus.errorCount > 0 && (
          <Badge variant="accent" dot>{layoutStatus.errorCount} error{layoutStatus.errorCount !== 1 ? 's' : ''}</Badge>
        )}
        {layoutStatus.errorCount === 0 && layoutStatus.warningCount > 0 && (
          <Badge variant="warning" dot>{layoutStatus.warningCount} warning{layoutStatus.warningCount !== 1 ? 's' : ''}</Badge>
        )}
        <Badge>Step {stepIndex + 1} of {steps.length}</Badge>
      </span>
    </>
  )

  return (
    <Card header={headerNode}>
      <Stepper
        steps={steps}
        activeIndex={stepIndex}
        onStepSelect={(stepId) => setDraftStep(stepId as BoxWizardStepId)}
      />

      {draftStep === 'shape' && (
        <div className="style-grid">
          {shapeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`style-card${draft.shapeType === option.id ? ' active' : ''}`}
              onClick={() => setDraftShapeType(option.id)}
            >
              <strong>{option.title}</strong>
            </button>
          ))}
        </div>
      )}

      {draftStep === 'dimensions' && (
        <div className="wizard-section">
          <Input
            label="Queue name"
            type="text"
            value={draft.name}
            onChange={(event) => setDraftName(event.target.value)}
          />

          {draft.shapeType === 'cylinder' ? (
            <div className="panel-grid">
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
            <div className="panel-grid">
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
        </div>
      )}

      {draftStep === 'style' && (
        <div className="wizard-section">
          {draft.shapeType === 'cylinder' ? (
            <p className="toolbar-note">Cylinder style is fixed — straight body wrap with two fitted caps.</p>
          ) : (
            <div className="style-grid">
              {styleOptions.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`style-card${draft.boxInput.style === style.id ? ' active' : ''}`}
                  onClick={() => setDraftStyle(style.id)}
                >
                  <strong>{style.title}</strong>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {draftStep === 'material' && (
        <div className="wizard-section style-grid">
          {getMaterialOptions().map((material) => (
            <button
              key={material.id}
              type="button"
              className={`style-card${draft.materialId === material.id ? ' active' : ''}`}
              onClick={() => setDraftMaterialId(material.id)}
            >
              <strong>{material.label}</strong>
              <small>{material.description}</small>
            </button>
          ))}
        </div>
      )}

      {draftStep === 'paper' && (
        <div className="wizard-section">
          <div className="panel-grid">
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

          <div className="margin-grid">
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
      )}

      {draftStep === 'preview' && (
        <div className="wizard-section">
          <div className="summary-grid">
            <div className="summary-item">
              <span className="meta-label">Material</span>
              <strong>{activeMaterial.label}</strong>
            </div>
            <div className="summary-item">
              <span className="meta-label">Panels</span>
              <strong>{previewTemplate.panels.length}</strong>
            </div>
            <div className="summary-item">
              <span className="meta-label">Tabs</span>
              <strong>{previewTemplate.tabs.length}</strong>
            </div>
          </div>

          <div className="wizard-actions-inline">
            <div className="toolbar-group">
              <Button onClick={() => addDraftToQueue()} variant="ghost" disabled={!canExportPreviewPdf} title={!canExportPreviewPdf ? layoutStatus.description : ''}>
                {isEditingQueueItem ? 'Save Changes' : 'Add to Queue'}
              </Button>
              {isEditingQueueItem && (
                <Button variant="ghost" onClick={() => cancelEditingQueueItem()}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {showLayoutStatus && (
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
      )}

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

      <div className="wizard-footer">
        <div className="wizard-footer__actions toolbar-group">
          <Button onClick={onExportPreviewPdf} disabled={!canExportPreviewPdf} title={!canExportPreviewPdf ? layoutStatus.description : ''}>
            PDF
          </Button>
          <Button onClick={onExportPreviewSvg} disabled={!canExportPreviewSvg} title={!canExportPreviewSvg ? layoutStatus.description : ''}>
            SVG
          </Button>
          <Button onClick={() => resetDraft()}>
            Start Over
          </Button>
        </div>
        <div className="wizard-footer__nav">
          <Button onClick={() => previousDraftStep()} disabled={stepIndex === 0}>
            Back
          </Button>
          <Button onClick={() => nextDraftStep()} disabled={stepIndex === steps.length - 1}>
            Next
          </Button>
        </div>
      </div>
    </Card>
  )
}
