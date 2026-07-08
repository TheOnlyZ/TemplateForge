import { type ChangeEvent, useMemo, useRef, useState } from 'react'
import { BoxAssemblyView } from '../assembly/BoxAssemblyView.tsx'
import { buildAssemblyPartMappings } from '../assembly/mapping.ts'
import type { AssemblyFaceId, AssemblySequenceStepId } from '../assembly/BoxAssemblyView.tsx'
import { TemplatePreview } from '../preview/TemplatePreview.tsx'
import { BoxWizard } from '../wizard/box-wizard/BoxWizard.tsx'
import {
  buildPdfFileName,
  buildProjectPdfFileName,
  buildProjectStateFileName,
  buildSvgFileName,
  downloadBytes,
  downloadText,
} from '../export/download.ts'
import {
  createProjectFileContents,
  getDefaultProjectName,
  parseProjectFileContents,
} from '../project/persistence.ts'
import { layoutTemplate } from '../../domain/layout/index.ts'
import { getMaterialDefinition } from '../../domain/materials/index.ts'
import { getPaperDefinition, type Orientation, type OrientationPreference } from '../../domain/paper/index.ts'
import { generateBoxTemplate, type BoxStyle } from '../../domain/shapes/box/index.ts'
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

function buildDraftPreview(draft: BoxDraft, templateId = `preview-${draft.boxInput.style}`) {
  const paper = getPaperDefinition(draft.paperSizeId)
  const { template } = generateBoxTemplate(draft.boxInput, {
    itemId: templateId,
    itemName: draft.name,
  })
  const layout = layoutTemplate(template, paper, draft.orientation, draft.margins)
  const inputValidation = validateTemplateInput({
    dimensionsMm: {
      length: draft.boxInput.externalLengthMm,
      width: draft.boxInput.externalWidthMm,
      height: draft.boxInput.externalHeightMm,
      glueTabWidth: draft.boxInput.glueTabWidthMm,
    },
  })
  const geometryValidation = validateTemplateGeometry(template)
  const shapeValidation = mergeValidationResults(inputValidation, geometryValidation)
  const layoutValidation = validateLayoutResult({
    pageCount: layout.pageCount,
    printableAreaOverflow: layout.printableAreaOverflow,
    hasLegalPlacement: layout.hasLegalPlacement,
    printableAreaWidthMm: layout.printableArea.width,
    printableAreaHeightMm: layout.printableArea.height,
    margins: draft.margins,
  })
  const validation = mergeValidationResults(shapeValidation, layoutValidation)

  return { paper, template, layout, shapeValidation, validation }
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

function getOrientationLabel(orientation: Orientation) {
  return orientation === 'portrait' ? 'Portrait' : 'Landscape'
}

function getOrientationStrategyLabel(
  orientation: OrientationPreference,
  layout: ReturnType<typeof buildDraftPreview>['layout'],
) {
  if (orientation !== 'auto') {
    return getOrientationLabel(orientation)
  }

  const resolvedOrientation = layout.pages[0]?.orientation

  return resolvedOrientation === undefined ? 'Auto' : `Auto -> ${getOrientationLabel(resolvedOrientation)}`
}

function hasBlockingIssues(messages: ReturnType<typeof buildDraftPreview>['validation']['messages']) {
  return messages.some((message) => message.severity === 'error')
}

function getFaceHighlightTargets(template: ReturnType<typeof buildDraftPreview>['template'], style: BoxStyle) {
  const frontPanel = template.panels.find((panel) => panel.name === (style === 'open-tray' ? 'Front Wall' : 'Front Panel'))
  const sidePanel = template.panels.find((panel) => panel.name === (style === 'open-tray' ? 'Right Wall' : 'Right Panel'))
  const topTargetIds =
    style === 'open-tray'
      ? template.panels.filter((panel) => panel.name === 'Base').map((panel) => panel.id)
      : template.tabs.filter((tab) => tab.label?.startsWith('Top ')).map((tab) => tab.id)

  return {
    front: frontPanel === undefined ? [] : [frontPanel.id],
    side: sidePanel === undefined ? [] : [sidePanel.id],
    top: topTargetIds,
  } satisfies Record<AssemblyFaceId, string[]>
}

function getFoldGuidanceTargets(
  template: ReturnType<typeof buildDraftPreview>['template'],
  style: BoxStyle,
  stepId: AssemblySequenceStepId | null,
) {
  if (stepId === null) {
    return {
      foldIds: [],
      targetIds: [],
    }
  }

  if (style === 'open-tray') {
    if (stepId === 'flat-setup') {
      return {
        foldIds: template.foldLines
          .filter((line) => line.id.includes('front-wall') || line.id.includes('back-wall'))
          .map((line) => line.id),
        targetIds: template.panels
          .filter((panel) => panel.name === 'Front Wall' || panel.name === 'Back Wall')
          .map((panel) => panel.id),
      }
    }

    if (stepId === 'walls-rising') {
      return {
        foldIds: template.foldLines
          .filter((line) => line.id.includes('left-wall') || line.id.includes('right-wall'))
          .map((line) => line.id),
        targetIds: template.panels
          .filter((panel) => panel.name === 'Left Wall' || panel.name === 'Right Wall')
          .map((panel) => panel.id),
      }
    }

    return {
      foldIds: template.foldLines.filter((line) => line.id.includes('tab-')).map((line) => line.id),
      targetIds: template.tabs.map((tab) => tab.id),
    }
  }

  if (stepId === 'wrap-body') {
    return {
      foldIds: template.foldLines
        .filter(
          (line) =>
            line.id.includes('front-right') ||
            line.id.includes('right-back') ||
            line.id.includes('back-left'),
        )
        .map((line) => line.id),
      targetIds: template.panels.map((panel) => panel.id),
    }
  }

  if (stepId === 'square-shell') {
    return {
      foldIds: template.foldLines.filter((line) => line.id.includes('glue-seam')).map((line) => line.id),
      targetIds: template.tabs.filter((tab) => tab.label === 'Glue Seam').map((tab) => tab.id),
    }
  }

  return {
    foldIds: template.foldLines
      .filter((line) => line.id.includes('top-') || line.id.includes('bottom-'))
      .map((line) => line.id),
    targetIds: template.tabs
      .filter((tab) => tab.label?.startsWith('Top ') || tab.label?.startsWith('Bottom '))
      .map((tab) => tab.id),
  }
}

export function WorkspacePage() {
  const {
    draft,
    duplicateQueueItem,
    editingQueueItemId,
    loadProjectSnapshot,
    queueItems,
    removeQueueItem,
    setUnitSystem,
    startEditingQueueItem,
    unitSystem,
  } = useAppStore()
  const preview = buildDraftPreview(draft, 'preview-draft')
  const primaryPart = preview.template.parts[0]!
  const draftMaterial = getMaterialDefinition(draft.materialId)
  const canExportPreviewSvg = !hasBlockingIssues(preview.shapeValidation.messages)
  const canExportPreviewPdf = !hasBlockingIssues(preview.validation.messages)
  const projectFileInputRef = useRef<HTMLInputElement | null>(null)
  const [highlightedAssemblyFaceId, setHighlightedAssemblyFaceId] = useState<AssemblyFaceId | null>(null)
  const [activeAssemblyStepId, setActiveAssemblyStepId] = useState<AssemblySequenceStepId | null>(null)
  const editingQueueItem =
    editingQueueItemId === null
      ? null
      : queueItems.find((item) => item.id === editingQueueItemId) ?? null
  const faceHighlightTargets = useMemo(
    () => getFaceHighlightTargets(preview.template, draft.boxInput.style),
    [draft.boxInput.style, preview.template],
  )
  const assemblyPartMappings = useMemo(
    () => buildAssemblyPartMappings(preview.template, preview.layout),
    [preview.layout, preview.template],
  )
  const foldGuidanceTargets = useMemo(
    () => getFoldGuidanceTargets(preview.template, draft.boxInput.style, activeAssemblyStepId),
    [activeAssemblyStepId, draft.boxInput.style, preview.template],
  )
  const highlightedTargetIds = useMemo(
    () =>
      highlightedAssemblyFaceId === null
        ? foldGuidanceTargets.targetIds.length === 0
          ? undefined
          : new Set(foldGuidanceTargets.targetIds)
        : new Set(faceHighlightTargets[highlightedAssemblyFaceId]),
    [faceHighlightTargets, foldGuidanceTargets.targetIds, highlightedAssemblyFaceId],
  )
  const highlightedFoldIds = useMemo(
    () =>
      foldGuidanceTargets.foldIds.length === 0 ? undefined : new Set(foldGuidanceTargets.foldIds),
    [foldGuidanceTargets.foldIds],
  )
  const exportableQueueItems = queueItems
    .map((item) => ({ item, result: buildDraftPreview(item, item.id) }))
    .filter((entry) => !hasBlockingIssues(entry.result.validation.messages))

  async function exportDraftPdf() {
    if (!canExportPreviewPdf) {
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

  async function exportDraftSvg() {
    if (!canExportPreviewSvg) {
      return
    }

    const { exportTemplateToSvg } = await import('../../renderers/svg-export/index.ts')

    const svg = exportTemplateToSvg(preview.template)

    downloadText(svg, buildSvgFileName(preview.template.name), 'image/svg+xml')
  }

  async function exportQueueItemPdf(itemId: string) {
    const item = queueItems.find((candidate) => candidate.id === itemId)
    if (!item) {
      return
    }

    const result = buildDraftPreview(item, item.id)
    if (hasBlockingIssues(result.validation.messages)) {
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

  async function exportQueueItemSvg(itemId: string) {
    const item = queueItems.find((candidate) => candidate.id === itemId)
    if (!item) {
      return
    }

    const result = buildDraftPreview(item, item.id)
    if (hasBlockingIssues(result.shapeValidation.messages)) {
      return
    }

    const { exportTemplateToSvg } = await import('../../renderers/svg-export/index.ts')

    const svg = exportTemplateToSvg(result.template)

    downloadText(svg, buildSvgFileName(result.template.name), 'image/svg+xml')
  }

  async function exportProjectQueuePdf() {
    if (exportableQueueItems.length === 0) {
      return
    }

    const { exportProjectToPdf } = await import('../../renderers/pdf/index.ts')

    const bytes = await exportProjectToPdf(
      exportableQueueItems.map(({ item, result }) => ({
        id: item.id,
        template: result.template,
        layout: result.layout,
        paper: result.paper,
        orientation: item.orientation,
        margins: item.margins,
      })),
    )

    downloadBytes(
      bytes,
      buildProjectPdfFileName('TemplateForge_Project_Queue', exportableQueueItems.length),
      'application/pdf',
    )
  }

  function saveProjectFile() {
    const snapshot = useAppStore.getState()
    const projectName = getDefaultProjectName(snapshot)

    downloadText(
      createProjectFileContents(snapshot, projectName),
      buildProjectStateFileName(projectName),
      'application/json',
    )
  }

  function openProjectFile() {
    projectFileInputRef.current?.click()
  }

  async function handleProjectFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      const snapshot = parseProjectFileContents(await file.text())
      loadProjectSnapshot(snapshot)
    } catch {
      window.alert('Could not open this project file. Make sure it is a valid TemplateForge project export.')
    }
  }

  return (
    <>
      <input
        ref={projectFileInputRef}
        type="file"
        accept="application/json,.json,.templateforge.json"
        hidden
        onChange={handleProjectFileChange}
      />
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
          <div className="toolbar-group" aria-label="Project file actions">
            <button type="button" className="toolbar-button" onClick={saveProjectFile}>
              Save Project
            </button>
            <button type="button" className="toolbar-button" onClick={openProjectFile}>
              Open Project
            </button>
          </div>
          <p className="toolbar-note">
            Current slice: project save/reopen, grouped exports, tiled print layouts, and an interactive 3D assembly sequence.
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
                model drives the SVG preview plus PDF and SVG export paths.
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
                      ? `Fits current printable area with ${getOrientationStrategyLabel(draft.orientation, preview.layout)}.`
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
            <div className="canvas-content canvas-content--preview-grid">
              <div className="preview-stage">
                <div>
                  <h3>Live Template Preview</h3>
                  <p>
                    Generated from canonical template data. This is the same model the layout engine
                    plus the PDF and SVG renderers consume.
                  </p>
                </div>
                <TemplatePreview
                  template={preview.template}
                  highlightedFoldIds={highlightedFoldIds}
                  highlightedTargetIds={highlightedTargetIds}
                />
              </div>
              <div className="preview-stage">
                <div>
                  <h3>3D Assembly View</h3>
                  <p>
                    Isometric assembled-form preview driven by the current box dimensions and style
                    selection. Sequence steps now drive fold guidance while face hover still spotlights
                    matching template regions and printable page mappings.
                  </p>
                </div>
                <BoxAssemblyView
                  activeFaceId={highlightedAssemblyFaceId}
                  name={draft.name}
                  boxInput={draft.boxInput}
                  onFaceHighlightChange={setHighlightedAssemblyFaceId}
                  onSequenceStepChange={setActiveAssemblyStepId}
                  partMappings={assemblyPartMappings}
                  unitSystem={unitSystem}
                />
              </div>
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
            canExportPreviewPdf={canExportPreviewPdf}
            canExportPreviewSvg={canExportPreviewSvg}
            onExportPreviewPdf={exportDraftPdf}
            onExportPreviewSvg={exportDraftSvg}
          />

          <article className="queue-card">
            <div className="wizard-header">
              <div>
                <h3>Project Queue</h3>
                <p>Committed parametric items ready for editing, duplication, and grouped project exports.</p>
              </div>
              <div className="toolbar-group">
                <span className="tag">
                  {queueItems.length} item{queueItems.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  className="toolbar-button"
                  onClick={exportProjectQueuePdf}
                  disabled={exportableQueueItems.length === 0}
                >
                  Export Batch PDF
                </button>
              </div>
            </div>

            {queueItems.length > 0 && (
              <>
                <p className="toolbar-note">
                  Batch PDF export combines all export-safe queue items into one printable document.
                </p>
                {editingQueueItem && (
                  <p className="toolbar-note">
                    Editing <strong>{editingQueueItem.name}</strong> in the wizard. Save changes or cancel edit before switching away.
                  </p>
                )}
              </>
            )}

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
                  const itemResult = buildDraftPreview(item, item.id)
                  const itemMaterial = getMaterialDefinition(item.materialId)
                  const itemPart = itemResult.template.parts[0]!
                  const canExportItemSvg = !hasBlockingIssues(itemResult.shapeValidation.messages)
                  const canExportItemPdf = !hasBlockingIssues(itemResult.validation.messages)

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
                        <span>{getOrientationStrategyLabel(item.orientation, itemResult.layout)}</span>
                        <span>{formatLength(itemPart.bounds.width, unitSystem)} part width</span>
                      </div>
                      <div className="wizard-actions-inline queue-actions-inline">
                        <div className="toolbar-group queue-actions-group">
                          <button
                            type="button"
                            className="toolbar-button"
                            onClick={() => exportQueueItemPdf(item.id)}
                            disabled={!canExportItemPdf}
                          >
                            Export PDF
                          </button>
                          <button
                            type="button"
                            className="toolbar-button"
                            onClick={() => exportQueueItemSvg(item.id)}
                            disabled={!canExportItemSvg}
                          >
                            Export SVG
                          </button>
                          <button
                            type="button"
                            className="toolbar-button"
                            onClick={() => startEditingQueueItem(item.id)}
                            disabled={editingQueueItemId === item.id}
                          >
                            {editingQueueItemId === item.id ? 'Editing' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            className="toolbar-button"
                            onClick={() => duplicateQueueItem(item.id)}
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            className="toolbar-button toolbar-button--ghost"
                            onClick={() => removeQueueItem(item.id)}
                          >
                            Remove
                          </button>
                        </div>
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
                  <span>Current draft is valid for the implemented print workflow.</span>
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
