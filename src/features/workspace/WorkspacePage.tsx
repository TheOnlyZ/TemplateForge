import { TemplatePreview } from '../preview/TemplatePreview.tsx'
import { BoxWizard } from '../wizard/box-wizard/BoxWizard.tsx'
import { buildPdfFileName, downloadBytes } from '../export/download.ts'
import { layoutTemplate } from '../../domain/layout/index.ts'
import { getMaterialDefinition } from '../../domain/materials/index.ts'
import { getPaperDefinition } from '../../domain/paper/index.ts'
import { generateBoxTemplate } from '../../domain/shapes/box/index.ts'
import { formatLength } from '../../domain/units/index.ts'
import {
  DEFAULT_MAX_DIMENSION_MM,
  DEFAULT_MIN_DIMENSION_MM,
  mergeValidationResults,
  validateLayoutResult,
  validateTemplateGeometry,
  validateTemplateInput,
} from '../../domain/validation/index.ts'
import { type BoxDraft, useAppStore } from '../../store/app-store.ts'

function buildDraftPreview(draft: BoxDraft) {
  const paper = getPaperDefinition(draft.paperSizeId)
  const { template } = generateBoxTemplate(draft.boxInput, {
    itemId: `preview-${draft.boxInput.style}`,
    itemName: draft.name,
  })
  const layout = layoutTemplate(template, paper, draft.orientation, draft.margins)
  const validation = mergeValidationResults(
    validateTemplateInput({
      dimensionsMm: {
        length: draft.boxInput.externalLengthMm,
        width: draft.boxInput.externalWidthMm,
        height: draft.boxInput.externalHeightMm,
        glueTabWidth: draft.boxInput.glueTabWidthMm,
      },
    }),
    validateTemplateGeometry(template),
    validateLayoutResult({
      pageCount: layout.pageCount,
      printableAreaOverflow: layout.printableAreaOverflow,
      hasLegalPlacement: layout.hasLegalPlacement,
    }),
  )

  return { paper, template, layout, validation }
}

function getStyleLabel(style: string) {
  if (style === 'open-tray') {
    return 'Open Tray'
  }

  if (style === 'glue-tab-carton') {
    return 'Glue Tab Carton'
  }

  return 'Tuck Carton'
}

function hasBlockingIssues(messages: ReturnType<typeof buildDraftPreview>['validation']['messages']) {
  return messages.some((message) => message.severity === 'error')
}

export function WorkspacePage() {
  const { draft, queueItems, removeQueueItem, setUnitSystem, unitSystem } = useAppStore()
  const preview = buildDraftPreview(draft)
  const primaryPart = preview.template.parts[0]!
  const draftMaterial = getMaterialDefinition(draft.materialId)

  async function exportDraftPdf() {
    if (!preview.layout.hasLegalPlacement || hasBlockingIssues(preview.validation.messages)) {
      return
    }

    const { exportTemplateToPdf } = await import('../../renderers/pdf/index.ts')

    const bytes = await exportTemplateToPdf({
      template: preview.template,
      layout: preview.layout,
      paper: preview.paper,
    })

    downloadBytes(
      bytes,
      buildPdfFileName(preview.template.name, draft.paperSizeId),
      'application/pdf',
    )
  }

  async function exportQueueItemPdf(itemId: string) {
    const item = queueItems.find((candidate) => candidate.id === itemId)
    if (!item) {
      return
    }

    const result = buildDraftPreview(item)
    if (!result.layout.hasLegalPlacement || hasBlockingIssues(result.validation.messages)) {
      return
    }

    const { exportTemplateToPdf } = await import('../../renderers/pdf/index.ts')

    const bytes = await exportTemplateToPdf({
      template: result.template,
      layout: result.layout,
      paper: result.paper,
    })

    downloadBytes(
      bytes,
      buildPdfFileName(result.template.name, item.paperSizeId),
      'application/pdf',
    )
  }

  return (
    <>
      <header className="app-toolbar">
        <div className="toolbar-title">
          <h1>TemplateForge</h1>
          <p>
            Browser-based physical template design with true-scale geometry and printable layout
            rules.
          </p>
        </div>
        <div className="toolbar-actions">
          <div className="toolbar-group" aria-label="Unit system">
            <button
              type="button"
              className="toolbar-button"
              aria-pressed={unitSystem === 'metric'}
              onClick={() => setUnitSystem('metric')}
            >
              Metric
            </button>
            <button
              type="button"
              className="toolbar-button"
              aria-pressed={unitSystem === 'imperial'}
              onClick={() => setUnitSystem('imperial')}
            >
              Imperial
            </button>
          </div>
          <p className="toolbar-note">
            Current slice: box wizard, three box styles, single-page layout, and PDF export.
          </p>
        </div>
      </header>

      <main className="workspace">
        <section className="workspace-main">
          <div className="workspace-intro">
            <article className="hero-card">
              <h2>Rectangular Box Vertical Slice</h2>
              <p>
                The wizard now feeds a shared geometry pipeline for <code>Open Tray</code>,{' '}
                <code>Glue Tab Carton</code>, and <code>Tuck Carton</code>. The same canonical
                model drives the SVG preview and the first PDF export path.
              </p>
              <div className="hero-stats">
                <div className="summary-item">
                  <span className="meta-label">Current draft</span>
                  <strong>{draft.name}</strong>
                  <p>{getStyleLabel(String(preview.template.metadata.style))}</p>
                </div>
                <div className="summary-item">
                  <span className="meta-label">Material guidance</span>
                  <strong>{draftMaterial.label}</strong>
                  <p>{draftMaterial.assemblyNote}</p>
                </div>
                <div className="summary-item">
                  <span className="meta-label">Paper target</span>
                  <strong>{preview.paper.label}</strong>
                  <p>
                    {preview.layout.hasLegalPlacement
                      ? 'Fits current printable area.'
                      : 'Does not fit current printable area.'}
                  </p>
                </div>
              </div>
            </article>

            <aside className="detail-card">
              <h3>Guardrails</h3>
              <div className="detail-grid">
                <div>
                  <span className="meta-label">Minimum supported dimension</span>
                  <strong>{formatLength(DEFAULT_MIN_DIMENSION_MM, unitSystem)}</strong>
                </div>
                <div>
                  <span className="meta-label">Maximum supported dimension</span>
                  <strong>{formatLength(DEFAULT_MAX_DIMENSION_MM, unitSystem)}</strong>
                </div>
                <div>
                  <span className="meta-label">Current part envelope</span>
                  <strong>
                    {formatLength(primaryPart.bounds.width, unitSystem)} ×{' '}
                    {formatLength(primaryPart.bounds.height, unitSystem)}
                  </strong>
                </div>
              </div>
            </aside>
          </div>

          <article className="canvas-placeholder">
            <div className="canvas-content canvas-content--preview">
              <div>
                <h3>Live Template Preview</h3>
                <p>
                  Generated from canonical template data. This is the same model the layout engine
                  and PDF renderer consume.
                </p>
              </div>
              <TemplatePreview template={preview.template} />
            </div>
          </article>

          <article className="panel-card">
            <h3>Printable Area Snapshot</h3>
            <div className="detail-grid">
              <div>
                <span className="meta-label">Sheet</span>
                <strong>{preview.paper.label}</strong>
                <p>
                  {preview.paper.family === 'us'
                    ? 'US standard'
                    : 'International standard'}
                </p>
              </div>
              <div>
                <span className="meta-label">Usable width</span>
                <strong>{formatLength(preview.layout.printableArea.width, unitSystem)}</strong>
                <p>
                  {primaryPart.bounds.width <= preview.layout.printableArea.width
                    ? 'Current draft fits width.'
                    : 'Current draft exceeds width.'}
                </p>
              </div>
              <div>
                <span className="meta-label">Usable height</span>
                <strong>{formatLength(preview.layout.printableArea.height, unitSystem)}</strong>
                <p>
                  {primaryPart.bounds.height <= preview.layout.printableArea.height
                    ? 'Current draft fits height.'
                    : 'Current draft exceeds height.'}
                </p>
              </div>
            </div>
          </article>
        </section>

        <aside className="workspace-sidebar">
          <BoxWizard
            unitSystem={unitSystem}
            previewTemplate={preview.template}
            validationMessages={preview.validation.messages}
            previewFitsCurrentPaper={preview.layout.hasLegalPlacement}
            onExportPreviewPdf={exportDraftPdf}
          />

          <article className="queue-card">
            <div className="wizard-header">
              <div>
                <h3>Project Queue</h3>
                <p>Committed parametric items ready for later grouped exports.</p>
              </div>
              <span className="tag">
                {queueItems.length} item{queueItems.length === 1 ? '' : 's'}
              </span>
            </div>

            {queueItems.length === 0 ? (
              <div className="queue-empty">
                <strong>No queued templates yet</strong>
                <p>
                  Finish the wizard and add a box to the queue to start building a printable
                  project.
                </p>
              </div>
            ) : (
              <ul className="queue-list">
                {queueItems.map((item) => {
                  const itemResult = buildDraftPreview(item)
                  const itemMaterial = getMaterialDefinition(item.materialId)
                  const itemPart = itemResult.template.parts[0]!

                  return (
                    <li key={item.id} className="queue-item">
                      <div className="queue-item-header">
                        <div>
                          <h4>{item.name}</h4>
                          <p>{itemMaterial.label}</p>
                        </div>
                        <span className="tag">{getStyleLabel(item.boxInput.style)}</span>
                      </div>
                      <div className="queue-meta">
                        <span>{formatLength(item.boxInput.externalLengthMm, unitSystem)} L</span>
                        <span>{formatLength(item.boxInput.externalWidthMm, unitSystem)} W</span>
                        <span>{formatLength(item.boxInput.externalHeightMm, unitSystem)} H</span>
                        <span>{itemResult.paper.label}</span>
                        <span>{item.orientation}</span>
                        <span>{formatLength(itemPart.bounds.width, unitSystem)} part width</span>
                      </div>
                      <div className="wizard-actions-inline queue-actions-inline">
                        <button
                          type="button"
                          className="toolbar-button"
                          onClick={() => exportQueueItemPdf(item.id)}
                          disabled={
                            hasBlockingIssues(itemResult.validation.messages) ||
                            !itemResult.layout.hasLegalPlacement
                          }
                        >
                          Export PDF
                        </button>
                        <button
                          type="button"
                          className="toolbar-button toolbar-button--ghost"
                          onClick={() => removeQueueItem(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </article>

          <article className="panel-card">
            <h3>Validation Status</h3>
            <ul className="status-list">
              {preview.validation.messages.length === 0 ? (
                <li className="status-item">
                  <span className="status-badge" aria-hidden="true" />
                  <span>Current draft is valid for the implemented single-page workflow.</span>
                </li>
              ) : (
                preview.validation.messages.map((message) => (
                  <li key={message.code + message.message} className="status-item">
                    <span
                      className={`status-badge${message.severity === 'warning' ? ' warning' : ''}`}
                      aria-hidden="true"
                    />
                    <span>{message.message}</span>
                  </li>
                ))
              )}
            </ul>
          </article>
        </aside>
      </main>
    </>
  )
}
