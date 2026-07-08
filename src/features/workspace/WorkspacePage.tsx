import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { BoxAssemblyView } from '../assembly/BoxAssemblyView.tsx'
import { CylinderAssemblyView } from '../assembly/CylinderAssemblyView.tsx'
import { buildAssemblyPartMappings } from '../assembly/mapping.ts'
import { buildBoxAssemblyModel, buildCylinderAssemblyModel } from '../assembly/model.ts'
import type { AssemblyFaceId, AssemblyMode, AssemblySequenceStepId, AssemblyModel } from '../assembly/model.ts'
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
import { generateBoxTemplate, getBoxNetGenerator, type BoxNetType } from '../../domain/shapes/box/index.ts'
import { generateCylinderTemplate } from '../../domain/shapes/cylinder/index.ts'
import { formatLength } from '../../domain/units/index.ts'
import {
  DEFAULT_MAX_DIMENSION_MM,
  DEFAULT_MIN_DIMENSION_MM,
  mergeValidationResults,
  validateCylinderInput,
  validateLayoutResult,
  validateTemplateGeometry,
  validateTemplateInput,
} from '../../domain/validation/index.ts'
import { type BoxDraft, useAppStore } from '../../store/app-store.ts'

const NET_ORDER: BoxNetType[] = ['strip', 'cross', 't-layout']

function generateBoxTemplateWithNet(
  input: { externalLengthMm: number; externalWidthMm: number; externalHeightMm: number; glueTabWidthMm: number; style: string },
  context: { itemId: string; itemName: string },
  netType: BoxNetType,
) {
  const boxInput = input as import('../../domain/shapes/box/index.ts').BoxInput
  if (netType === 'strip') {
    return generateBoxTemplate(boxInput, context)
  }
  const generator = getBoxNetGenerator(netType)
  if (!generator) {
    return generateBoxTemplate(boxInput, context)
  }
  return generator(boxInput, context)
}

function calculateTotalOverflow(layout: { printableAreaOverflow: boolean; pages: { printableBounds: { width: number; height: number }; partPlacements: { bounds: { x: number; y: number; width: number; height: number } }[] }[] }) {
  if (!layout.printableAreaOverflow) return 0
  let total = 0
  for (const page of layout.pages) {
    for (const pp of page.partPlacements) {
      const b = pp.bounds
      const bRight = b.x + b.width
      const bBottom = b.y + b.height
      if (bRight > page.printableBounds.width) total += bRight - page.printableBounds.width
      if (bBottom > page.printableBounds.height) total += bBottom - page.printableBounds.height
    }
  }
  return total
}

function buildDraftPreview(draft: BoxDraft, templateId?: string) {
  const paper = getPaperDefinition(draft.paperSizeId)
  const tid = templateId ?? `preview-${draft.shapeType === 'cylinder' ? 'cylinder' : draft.boxInput.style}`

  const isCylinder = draft.shapeType === 'cylinder'

  if (isCylinder) {
    const { template } = generateCylinderTemplate(draft.cylinderInput, {
      itemId: tid,
      itemName: draft.name,
    })
    const layout = layoutTemplate(template, paper, draft.orientation, draft.margins)
    const inputValidation = validateCylinderInput({
      diameterMm: draft.cylinderInput.diameterMm,
      heightMm: draft.cylinderInput.heightMm,
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
    return { paper, template, layout, shapeValidation, validation, netType: null as BoxNetType | null }
  }

  const ctx = { itemId: tid, itemName: draft.name }
  const input = draft.boxInput
  let bestLayout = null as ReturnType<typeof layoutTemplate> | null
  let bestTemplateItem = null as import('../../domain/templates/index.ts').TemplateItem | null
  let bestNetType: BoxNetType = 'strip'

  for (const netType of NET_ORDER) {
    const result = generateBoxTemplateWithNet(input as any, ctx, netType)
    const layout = layoutTemplate(result.template, paper, draft.orientation, draft.margins)

    if (!layout.printableAreaOverflow) {
      bestLayout = layout
      bestTemplateItem = result.template
      bestNetType = netType
      break
    }

    if (
      bestLayout === null ||
      calculateTotalOverflow(layout) < calculateTotalOverflow(bestLayout)
    ) {
      bestLayout = layout
      bestTemplateItem = result.template
      bestNetType = netType
    }
  }

  const template = bestTemplateItem!
  const layout = bestLayout!
  const inputValidation =
    draft.shapeType === 'cylinder'
      ? validateCylinderInput({
          diameterMm: draft.cylinderInput.diameterMm,
          heightMm: draft.cylinderInput.heightMm,
        })
      : validateTemplateInput({
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

  return { paper, template, layout, shapeValidation, validation, netType: bestNetType }
}

function getStyleLabel(style: string) {
  if (style === 'open-tray') {
    return 'Open Tray'
  }

  if (style === 'glue-tab-carton') {
    return 'Glue Tab Carton'
  }

  if (style === 'cylinder') {
    return 'Straight Cylinder'
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
  const preview = useMemo(() => buildDraftPreview(draft, 'preview-draft'), [draft])
  const primaryPart = preview.template.parts[0]!
  const draftMaterial = getMaterialDefinition(draft.materialId)
  const canExportPreviewSvg = !hasBlockingIssues(preview.shapeValidation.messages)
  const canExportPreviewPdf = !hasBlockingIssues(preview.validation.messages)
  const projectFileInputRef = useRef<HTMLInputElement | null>(null)
  const [assemblyMode, setAssemblyMode] = useState<AssemblyMode>('finished')
  const [hoveredAssemblyFaceId, setHoveredAssemblyFaceId] = useState<AssemblyFaceId | null>(null)
  const [selectedAssemblyFaceId, setSelectedAssemblyFaceId] = useState<AssemblyFaceId | null>(null)
  const [activeAssemblyStepId, setActiveAssemblyStepId] = useState<AssemblySequenceStepId | null>(null)
  const editingQueueItem =
    editingQueueItemId === null
      ? null
      : queueItems.find((item) => item.id === editingQueueItemId) ?? null
  const assemblyModel: AssemblyModel = useMemo(() => {
    if (preview.template.shapeType === 'cylinder') {
      return buildCylinderAssemblyModel(preview.template)
    }

    return buildBoxAssemblyModel(preview.template, draft.boxInput.style)
  }, [draft.boxInput.style, preview.template])
  const assemblyPartMappings = useMemo(
    () => buildAssemblyPartMappings(preview.template, preview.layout),
    [preview.layout, preview.template],
  )
  const activeAssemblyStep = useMemo(
    () => assemblyModel.steps.find((step) => step.id === activeAssemblyStepId) ?? assemblyModel.steps[0] ?? null,
    [activeAssemblyStepId, assemblyModel.steps],
  )

  useEffect(() => {
    setAssemblyMode(assemblyModel.defaultMode)
    setHoveredAssemblyFaceId(null)
    setSelectedAssemblyFaceId(null)
    setActiveAssemblyStepId(assemblyModel.steps[0]?.id ?? null)
  }, [assemblyModel])

  const effectiveAssemblyFaceId =
    hoveredAssemblyFaceId ??
    selectedAssemblyFaceId ??
    (assemblyMode === 'sequence' ? activeAssemblyStep?.focusFaceId ?? null : null)
  const highlightedTargetIds = useMemo(
    () =>
      effectiveAssemblyFaceId === null
        ? assemblyMode === 'sequence' && activeAssemblyStep !== null && activeAssemblyStep.targetIds.length > 0
          ? new Set(activeAssemblyStep.targetIds)
          : undefined
        : new Set(
            assemblyModel.faces.find((face) => face.id === effectiveAssemblyFaceId)?.targetIds ?? [],
          ),
    [activeAssemblyStep, assemblyMode, assemblyModel.faces, effectiveAssemblyFaceId],
  )
  const highlightedFoldIds = useMemo(
    () =>
      assemblyMode === 'sequence' && activeAssemblyStep !== null && activeAssemblyStep.foldIds.length > 0
        ? new Set(activeAssemblyStep.foldIds)
        : undefined,
    [activeAssemblyStep, assemblyMode],
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
            Box and cylinder assembly modes with synchronized 2D/3D guidance and unit-correct input.
          </p>
        </div>
      </header>

      <main className="workspace">
        <section className="workspace-main">
          <div className="workspace-info-bar">
            <span className="info-chip">
              <span className="chip-label">Draft</span>
              <span className="chip-value">{draft.name}</span>
            </span>
            <span className="info-chip">
              <span className="chip-label">Shape</span>
              <span className="chip-value">{draft.shapeType === 'cylinder' ? 'Straight Cylinder' : getStyleLabel(String(preview.template.metadata.style))}</span>
            </span>
            <span className="info-chip">
              <span className="chip-label">Material</span>
              <span className="chip-value">{draftMaterial.label}</span>
            </span>
            <span className="info-chip">
              <span className="chip-label">Paper</span>
              <span className="chip-value">{preview.paper.label} · {getOrientationStrategyLabel(draft.orientation, preview.layout)}</span>
            </span>
            <span className="info-chip">
              <span className="chip-label">Printable</span>
              <span className="chip-value">{formatLength(preview.layout.printableArea.width, unitSystem)} × {formatLength(preview.layout.printableArea.height, unitSystem)}</span>
            </span>
            <span className="info-chip">
              <span className="chip-label">Limits</span>
              <span className="chip-value">{formatLength(DEFAULT_MIN_DIMENSION_MM, unitSystem)}–{formatLength(DEFAULT_MAX_DIMENSION_MM, unitSystem)}</span>
            </span>
            <span className={`info-chip status-chip${preview.layout.hasLegalPlacement ? ' status-ok' : ' status-warn'}`}>
              <span className="chip-label">Status</span>
              <span className="chip-value">{preview.layout.hasLegalPlacement ? 'Fits' : 'Overflow'}</span>
            </span>
          </div>

          <article className="canvas-placeholder">
            <div className="canvas-content canvas-content--preview-grid">
              <div className="preview-stage">
                <div>
                  <h3>Live Template Preview</h3>
                  <p>Flat 2D net with panels, folds, and tabs.</p>
                </div>
                <TemplatePreview
                  faceLabelLookup={assemblyModel.targetIdToFaceLabel}
                  faceTargetLookup={assemblyModel.targetIdToFaceId}
                  glueTabIds={assemblyModel.glueTabIds}
                  selectedFaceId={selectedAssemblyFaceId}
                  template={preview.template}
                  highlightedFoldIds={highlightedFoldIds}
                  highlightedTargetIds={highlightedTargetIds}
                  onFaceHoverChange={setHoveredAssemblyFaceId}
                  onFaceSelect={setSelectedAssemblyFaceId}
                />
              </div>
              <div className="preview-stage">
                <div>
                  <h3>3D Assembly View</h3>
                  <p>Finished, exploded, and step-by-step assembly guidance.</p>
                </div>
                {preview.template.shapeType === 'cylinder' ? (
                  <CylinderAssemblyView
                    activeFaceId={effectiveAssemblyFaceId}
                    activeStepId={activeAssemblyStep?.id ?? null}
                    name={preview.template.name}
                    cylinderInput={{
                      diameterMm: Number(preview.template.dimensionsMm.diameter ?? 0),
                      heightMm: Number(preview.template.dimensionsMm.height ?? 0),
                    }}
                    mode={assemblyMode}
                    model={assemblyModel}
                    onFaceHoverChange={setHoveredAssemblyFaceId}
                    onFaceSelect={setSelectedAssemblyFaceId}
                    onModeChange={setAssemblyMode}
                    onStepChange={setActiveAssemblyStepId}
                    partMappings={assemblyPartMappings}
                    selectedFaceId={selectedAssemblyFaceId}
                    unitSystem={unitSystem}
                  />
                ) : (
                  <BoxAssemblyView
                    activeFaceId={effectiveAssemblyFaceId}
                    activeStepId={activeAssemblyStep?.id ?? null}
                    name={draft.name}
                    boxInput={draft.boxInput}
                    mode={assemblyMode}
                    model={assemblyModel}
                    onFaceHoverChange={setHoveredAssemblyFaceId}
                    onFaceSelect={setSelectedAssemblyFaceId}
                    onModeChange={setAssemblyMode}
                    onStepChange={setActiveAssemblyStepId}
                    partMappings={assemblyPartMappings}
                    selectedFaceId={selectedAssemblyFaceId}
                    unitSystem={unitSystem}
                  />
                )}
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
                <p>Parametric items for editing, duplication, and batch export.</p>
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
                  Finish the wizard and add an item to the queue to start building a printable
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
                        <span className="tag">{item.shapeType === 'cylinder' ? 'Straight Cylinder' : getStyleLabel(item.boxInput.style)}</span>
                      </div>
                      <div className="queue-meta">
                        {item.shapeType === 'cylinder' ? (
                          <>
                            <span>{formatLength(item.cylinderInput.diameterMm, unitSystem)} dia</span>
                            <span>{formatLength(item.cylinderInput.heightMm, unitSystem)} H</span>
                          </>
                        ) : (
                          <>
                            <span>{formatLength(item.boxInput.externalLengthMm, unitSystem)} L</span>
                            <span>{formatLength(item.boxInput.externalWidthMm, unitSystem)} W</span>
                            <span>{formatLength(item.boxInput.externalHeightMm, unitSystem)} H</span>
                          </>
                        )}
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
