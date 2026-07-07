import { getMaterialDefinition, getMaterialOptions } from '../../../domain/materials/index.ts'
import { getPaperSizeOptions } from '../../../domain/paper/index.ts'
import type { TemplateItem } from '../../../domain/templates/index.ts'
import { formatLength, type UnitSystem } from '../../../domain/units/index.ts'
import type { BoxStyle } from '../../../domain/shapes/box/index.ts'
import { useAppStore, type BoxWizardStepId } from '../../../store/app-store.ts'

const steps: { id: BoxWizardStepId; label: string }[] = [
  { id: 'dimensions', label: 'Dimensions' },
  { id: 'style', label: 'Style' },
  { id: 'material', label: 'Material' },
  { id: 'paper', label: 'Paper' },
  { id: 'preview', label: 'Preview' },
  { id: 'queue', label: 'Add to Queue' },
]

const styleOptions: { id: BoxStyle; title: string; description: string }[] = [
  {
    id: 'glue-tab-carton',
    title: 'Glue Tab Carton',
    description: 'Strong permanent carton with a glued side seam and closure flaps.',
  },
  {
    id: 'tuck-carton',
    title: 'Tuck Carton',
    description: 'Retail-style carton with tuck closures for reuse and repeated opening.',
  },
  {
    id: 'open-tray',
    title: 'Open Tray',
    description: 'Open storage tray with folded walls and glued corner tabs.',
  },
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
    draft,
    draftStep,
    nextDraftStep,
    previousDraftStep,
    setDraftDimension,
    setDraftMargin,
    setDraftMaterialId,
    setDraftName,
    setDraftOrientation,
    setDraftPaperSizeId,
    setDraftStep,
    setDraftStyle,
  } = useAppStore()

  const stepIndex = steps.findIndex((step) => step.id === draftStep)
  const activeMaterial = getMaterialDefinition(draft.materialId)

  return (
    <article className="panel-card wizard-card">
      <div className="wizard-header">
        <div>
          <h3>Shape Wizard</h3>
          <p>Rectangular box workflow with a shared geometry and export pipeline.</p>
        </div>
        <span className="tag">
          Step {stepIndex + 1} of {steps.length}
        </span>
      </div>

      <ol className="wizard-steps" aria-label="Wizard steps">
        {steps.map((step, index) => (
          <li key={step.id}>
            <button
              type="button"
              className={`wizard-step${step.id === draftStep ? ' active' : ''}`}
              aria-current={step.id === draftStep ? 'step' : undefined}
              onClick={() => setDraftStep(step.id)}
            >
              <span>{index + 1}</span>
              {step.label}
            </button>
          </li>
        ))}
      </ol>

      {draftStep === 'dimensions' && (
        <div className="wizard-section">
          <label className="panel-field">
            <span>Queue name</span>
            <input
              className="panel-input"
              type="text"
              value={draft.name}
              onChange={(event) => setDraftName(event.target.value)}
            />
          </label>

          <div className="panel-grid">
            <label className="panel-field">
              <span>External length</span>
              <input
                className="panel-input"
                type="number"
                min="12.7"
                max="914.4"
                step="1"
                value={draft.boxInput.externalLengthMm}
                onChange={(event) => setDraftDimension('externalLengthMm', Number(event.target.value))}
              />
              <small>{formatLength(draft.boxInput.externalLengthMm, unitSystem)}</small>
            </label>

            <label className="panel-field">
              <span>External width</span>
              <input
                className="panel-input"
                type="number"
                min="12.7"
                max="914.4"
                step="1"
                value={draft.boxInput.externalWidthMm}
                onChange={(event) => setDraftDimension('externalWidthMm', Number(event.target.value))}
              />
              <small>{formatLength(draft.boxInput.externalWidthMm, unitSystem)}</small>
            </label>

            <label className="panel-field">
              <span>External height</span>
              <input
                className="panel-input"
                type="number"
                min="12.7"
                max="914.4"
                step="1"
                value={draft.boxInput.externalHeightMm}
                onChange={(event) => setDraftDimension('externalHeightMm', Number(event.target.value))}
              />
              <small>{formatLength(draft.boxInput.externalHeightMm, unitSystem)}</small>
            </label>

            <label className="panel-field">
              <span>Glue tab / seam width</span>
              <input
                className="panel-input"
                type="number"
                min="6"
                max="40"
                step="1"
                value={draft.boxInput.glueTabWidthMm}
                onChange={(event) => setDraftDimension('glueTabWidthMm', Number(event.target.value))}
              />
              <small>
                Recommended: {formatLength(activeMaterial.recommendedGlueTabWidthMm, unitSystem)}
              </small>
            </label>
          </div>
        </div>
      )}

      {draftStep === 'style' && (
        <div className="wizard-section style-grid">
          {styleOptions.map((style) => (
            <button
              key={style.id}
              type="button"
              className={`style-card${draft.boxInput.style === style.id ? ' active' : ''}`}
              onClick={() => setDraftStyle(style.id)}
            >
              <strong>{style.title}</strong>
              <span>{style.description}</span>
            </button>
          ))}
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
              <span>{material.description}</span>
              <small>{material.assemblyNote}</small>
            </button>
          ))}
        </div>
      )}

      {draftStep === 'paper' && (
        <div className="wizard-section">
          <div className="panel-grid">
            <label className="panel-field">
              <span>Paper size</span>
              <select
                className="panel-select"
                value={draft.paperSizeId}
                onChange={(event) => setDraftPaperSizeId(event.target.value as typeof draft.paperSizeId)}
              >
                {getPaperSizeOptions().map((paper) => (
                  <option key={paper.id} value={paper.id}>
                    {paper.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="panel-field">
              <span>Orientation strategy</span>
              <select
                className="panel-select"
                value={draft.orientation}
                onChange={(event) => setDraftOrientation(event.target.value as typeof draft.orientation)}
              >
                <option value="auto">Auto (recommended)</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>
          </div>

          <p className="toolbar-note">
            Supports US Letter, US Legal, A4, and A3 using the same calibrated PDF export path.
          </p>

          <div className="margin-grid">
            {([
              ['top', 'Top'],
              ['right', 'Right'],
              ['bottom', 'Bottom'],
              ['left', 'Left'],
            ] as const).map(([side, label]) => (
              <label key={side} className="panel-field">
                <span>{label} margin</span>
                <input
                  className="panel-input"
                  type="number"
                  min="3"
                  max="25.4"
                  step="0.1"
                  value={draft.margins[side]}
                  onChange={(event) => setDraftMargin(side, Number(event.target.value))}
                />
              </label>
            ))}
          </div>

          <p className="toolbar-note">
            Margins below 6.35 mm can fit more geometry, but some printers may clip calibration and tiling guides near the sheet edge.
          </p>
        </div>
      )}

      {draftStep === 'preview' && (
        <div className="wizard-section">
          <div className="summary-grid">
            <div className="summary-item">
              <span className="meta-label">Style</span>
              <strong>{styleOptions.find((style) => style.id === draft.boxInput.style)?.title}</strong>
            </div>
            <div className="summary-item">
              <span className="meta-label">Material</span>
              <strong>{activeMaterial.label}</strong>
            </div>
            <div className="summary-item">
              <span className="meta-label">Panels</span>
              <strong>{previewTemplate.panels.length}</strong>
            </div>
            <div className="summary-item">
              <span className="meta-label">Flaps / tabs</span>
              <strong>{previewTemplate.tabs.length}</strong>
            </div>
          </div>

          <div className="wizard-actions-inline">
            <div className="toolbar-group">
              <button
                type="button"
                className="toolbar-button"
                onClick={onExportPreviewPdf}
                disabled={!canExportPreviewPdf}
              >
                Export Preview PDF
              </button>
              <button
                type="button"
                className="toolbar-button"
                onClick={onExportPreviewSvg}
                disabled={!canExportPreviewSvg}
              >
                Export Preview SVG
              </button>
            </div>
            <p className="toolbar-note">
              {!canExportPreviewSvg
                ? 'Resolve blocking validation before exporting.'
                : canExportPreviewPdf
                  ? 'SVG and PDF export are ready for this preview.'
                  : 'SVG export is ready. PDF export still has blocking layout constraints.'}
            </p>
          </div>
        </div>
      )}

      {draftStep === 'queue' && (
        <div className="wizard-section">
          <p>
            Save the current parametric box to the project queue. The queue stores the shape
            parameters, material choice, and paper settings for later project exports.
          </p>
          <div className="wizard-actions-inline">
            <button
              type="button"
              className="toolbar-button"
              onClick={() => addDraftToQueue()}
              disabled={!canExportPreviewPdf}
            >
              Add to Queue
            </button>
            <p className="toolbar-note">
              {canExportPreviewPdf
                ? 'This item is ready to commit to the queue.'
                : 'Queue add is blocked until the preview is export-safe.'}
            </p>
          </div>
        </div>
      )}

      <div className="wizard-footer">
        <button
          type="button"
          className="toolbar-button"
          onClick={() => previousDraftStep()}
          disabled={stepIndex === 0}
        >
          Back
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => nextDraftStep()}
          disabled={stepIndex === steps.length - 1}
        >
          Next
        </button>
      </div>
    </article>
  )
}
