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
  formatLength,
  getUnitSuffix,
  parseEditableLengthInput,
  type UnitSystem,
} from '../../../domain/units/index.ts'
import type { BoxStyle } from '../../../domain/shapes/box/index.ts'
import type { ShapeType } from '../../../domain/shapes/shared/index.ts'
import { useAppStore, type BoxWizardStepId } from '../../../store/app-store.ts'

const steps: { id: BoxWizardStepId; label: string }[] = [
  { id: 'shape', label: 'Shape' },
  { id: 'dimensions', label: 'Dimensions' },
  { id: 'style', label: 'Style' },
  { id: 'material', label: 'Material' },
  { id: 'paper', label: 'Paper' },
  { id: 'preview', label: 'Preview' },
  { id: 'queue', label: 'Queue' },
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
}

export function BoxWizard({
  unitSystem,
  previewTemplate,
  canExportPreviewPdf,
  canExportPreviewSvg,
  onExportPreviewPdf,
  onExportPreviewSvg,
}: BoxWizardProps) {
  const {
    addDraftToQueue,
    cancelEditingQueueItem,
    draft,
    draftStep,
    editingQueueItemId,
    nextDraftStep,
    previousDraftStep,
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
  const alternateUnitSystem = unitSystem === 'metric' ? 'imperial' : 'metric'

  function formatInputValue(valueMm: number) {
    return formatEditableLength(valueMm, unitSystem)
  }

  function parseInputValue(value: string) {
    return parseEditableLengthInput(Number(value), unitSystem)
  }

  function formatAlternateLength(valueMm: number) {
    return `≈ ${formatLength(valueMm, alternateUnitSystem)}`
  }

  const headerNode = (
    <>
      <span>Shape Wizard</span>
      <Badge>Step {stepIndex + 1} of {steps.length}</Badge>
    </>
  )

  return (
    <Card header={headerNode}>
      <Stepper
        steps={steps}
        activeIndex={stepIndex}
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
              <Button onClick={onExportPreviewPdf} disabled={!canExportPreviewPdf}>
                PDF
              </Button>
              <Button onClick={onExportPreviewSvg} disabled={!canExportPreviewSvg}>
                SVG
              </Button>
            </div>
          </div>
        </div>
      )}

      {draftStep === 'queue' && (
        <div className="wizard-section">
          <p className="toolbar-note">
            {isEditingQueueItem
              ? 'Update the queued item with current wizard parameters.'
              : 'Save the current parameters to the project queue for export.'}
          </p>
          <div className="wizard-actions-inline">
            <div className="toolbar-group">
              <Button onClick={() => addDraftToQueue()} disabled={!canExportPreviewPdf}>
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

      <div className="wizard-footer">
        <Button onClick={() => previousDraftStep()} disabled={stepIndex === 0}>
          Back
        </Button>
        <Button onClick={() => nextDraftStep()} disabled={stepIndex === steps.length - 1}>
          Next
        </Button>
      </div>
    </Card>
  )
}
