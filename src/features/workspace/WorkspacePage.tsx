import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { BoxAssemblyView } from '../assembly/BoxAssemblyView.tsx'
import { CylinderAssemblyView } from '../assembly/CylinderAssemblyView.tsx'
import { buildAssemblyPartMappings } from '../assembly/mapping.ts'
import { buildBoxAssemblyModel, buildCylinderAssemblyModel } from '../assembly/model.ts'
import type { AssemblyFaceId, AssemblyMode, AssemblySequenceStepId, AssemblyModel } from '../assembly/model.ts'
import { TemplatePreview } from '../preview/TemplatePreview.tsx'
import { BoxWizard } from '../wizard/box-wizard/BoxWizard.tsx'
import { Toolbar } from './Toolbar.tsx'
import { Button } from '../../components/Button.tsx'
import { QueueSection } from './QueueSection.tsx'
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
import { generateBoxTemplateCandidates, generateBoxTemplate, type BoxNetType } from '../../domain/shapes/box/index.ts'
import { generateCylinderTemplate } from '../../domain/shapes/cylinder/index.ts'
import { formatLength } from '../../domain/units/index.ts'
import {
  DEFAULT_MAX_DIMENSION_MM,
  DEFAULT_MIN_DIMENSION_MM,
  type ValidationMessage,
  mergeValidationResults,
  validateCylinderInput,
  validateLayoutResult,
  validateNet,
  validateTemplateGeometry,
  validateTemplateInput,
} from '../../domain/validation/index.ts'
import { type BoxDraft, useAppStore } from '../../store/app-store.ts'
import type { LayoutStatus } from '../../domain/layout/index.ts'
import styles from './WorkspacePage.module.css'

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
    const layoutStatus = buildLayoutStatus(layout, validation.messages)
    return { paper, template, layout, shapeValidation, validation, netType: null as BoxNetType | null, layoutStatus }
  }

  const ctx = { itemId: tid, itemName: draft.name }
  const input = draft.boxInput
  let bestLayout = null as ReturnType<typeof layoutTemplate> | null
  let bestTemplateItem = null as import('../../domain/templates/index.ts').TemplateItem | null
  let bestNetType = null as BoxNetType | null
  let bestNetValidation = null as ReturnType<typeof validateNet> | null

  for (const candidate of generateBoxTemplateCandidates(input, ctx)) {
    const netVal = validateNet(candidate.net, input)
    const result = candidate.result
    const layout = layoutTemplate(result.template, paper, draft.orientation, draft.margins)

    if (!layout.printableAreaOverflow) {
      bestLayout = layout
      bestTemplateItem = result.template
      bestNetType = candidate.netType
      bestNetValidation = netVal
      break
    }

    if (
      bestLayout === null ||
      calculateTotalOverflow(layout) < calculateTotalOverflow(bestLayout)
    ) {
      bestLayout = layout
      bestTemplateItem = result.template
      bestNetType = candidate.netType
      bestNetValidation = netVal
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
  const shapeValidation = mergeValidationResults(inputValidation, geometryValidation, bestNetValidation ?? { valid: true, messages: [] })
  const layoutValidation = validateLayoutResult({
    pageCount: layout.pageCount,
    printableAreaOverflow: layout.printableAreaOverflow,
    hasLegalPlacement: layout.hasLegalPlacement,
    printableAreaWidthMm: layout.printableArea.width,
    printableAreaHeightMm: layout.printableArea.height,
    margins: draft.margins,
  })
  const validation = mergeValidationResults(shapeValidation, layoutValidation)
  const layoutStatus = buildLayoutStatus(layout, validation.messages)

  return { paper, template, layout, shapeValidation, validation, netType: bestNetType, layoutStatus }
}

function getStyleLabel(style: string) {
  if (style === 'open-tray') return 'Open Tray'
  if (style === 'glue-tab-carton') return 'Glue Tab Carton'
  if (style === 'cylinder') return 'Straight Cylinder'
  return 'Tuck Carton'
}

function getOrientationLabel(orientation: Orientation) {
  return orientation === 'portrait' ? 'Portrait' : 'Landscape'
}

function getOrientationStrategyLabel(
  orientation: OrientationPreference,
  layout: ReturnType<typeof buildDraftPreview>['layout'],
) {
  if (orientation !== 'auto') return getOrientationLabel(orientation)
  const resolvedOrientation = layout.pages[0]?.orientation
  return resolvedOrientation === undefined ? 'Auto' : `Auto → ${getOrientationLabel(resolvedOrientation)}`
}

function hasBlockingIssues(messages: ReturnType<typeof buildDraftPreview>['validation']['messages']) {
  return messages.some((message) => message.severity === 'error')
}

function buildLayoutStatus(
  layout: ReturnType<typeof buildDraftPreview>['layout'],
  messages: ReturnType<typeof buildDraftPreview>['validation']['messages'],
): LayoutStatus {
  const errorCount = messages.filter((m) => m.severity === 'error').length
  const warningCount = messages.filter((m) => m.severity === 'warning').length

  if (layout.layoutType === 'multi-piece') {
    return {
      type: 'multi-piece',
      description: `Prints as ${layout.assemblyCount} pieces — join labels included.`,
      errorCount,
      warningCount,
    }
  }

  if (layout.hasLegalPlacement) {
    return {
      type: 'single-piece',
      description: 'Fits on one page — ready to export.',
      errorCount,
      warningCount,
    }
  }

  const errorDescriptions = messages
    .filter((m) => m.severity === 'error')
    .map((m) => m.message)

  return {
    type: 'overflow',
    description: errorDescriptions[0] ?? 'Cannot fit on the selected paper. Try a larger size or reduce margins.',
    errorCount,
    warningCount,
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
  const [queueOpen, setQueueOpen] = useState(false)
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
    if (!canExportPreviewPdf) return
    const { exportTemplateToPdf } = await import('../../renderers/pdf/index.ts')
    const bytes = await exportTemplateToPdf({
      template: preview.template,
      layout: preview.layout,
      paper: preview.paper,
    })
    downloadBytes(bytes, buildPdfFileName(preview.template.name, draft.paperSizeId), 'application/pdf')
  }

  async function exportDraftSvg() {
    if (!canExportPreviewSvg) return
    const { exportTemplateToSvg } = await import('../../renderers/svg-export/index.ts')
    const svg = exportTemplateToSvg(preview.template)
    downloadText(svg, buildSvgFileName(preview.template.name), 'image/svg+xml')
  }

  async function exportQueueItemPdf(itemId: string) {
    const item = queueItems.find((candidate) => candidate.id === itemId)
    if (!item) return
    const result = buildDraftPreview(item, item.id)
    if (hasBlockingIssues(result.validation.messages)) return
    const { exportTemplateToPdf } = await import('../../renderers/pdf/index.ts')
    const bytes = await exportTemplateToPdf({
      template: result.template,
      layout: result.layout,
      paper: result.paper,
    })
    downloadBytes(bytes, buildPdfFileName(result.template.name, item.paperSizeId), 'application/pdf')
  }

  async function exportQueueItemSvg(itemId: string) {
    const item = queueItems.find((candidate) => candidate.id === itemId)
    if (!item) return
    const result = buildDraftPreview(item, item.id)
    if (hasBlockingIssues(result.shapeValidation.messages)) return
    const { exportTemplateToSvg } = await import('../../renderers/svg-export/index.ts')
    const svg = exportTemplateToSvg(result.template)
    downloadText(svg, buildSvgFileName(result.template.name), 'image/svg+xml')
  }

  async function exportProjectQueuePdf() {
    if (exportableQueueItems.length === 0) return
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

  const projectFileInputRefVal = projectFileInputRef

  async function handleProjectFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const snapshot = parseProjectFileContents(await file.text())
      loadProjectSnapshot(snapshot)
    } catch {
      window.alert('Could not open this project file. Make sure it is a valid TemplateForge project export.')
    }
  }

  return (
    <>
      <Toolbar
        unitSystem={unitSystem}
        onUnitSystemChange={setUnitSystem}
        onSaveProject={saveProjectFile}
        onOpenProject={() => projectFileInputRefVal.current?.click()}
        projectFileInputRef={projectFileInputRefVal}
        onProjectFileChange={handleProjectFileChange}
      />

      <main className={styles.workspace}>
        <section className={styles.canvas}>
          <div className={styles.infoBar}>
            <span className={styles.chip}>
              <span className={styles.chipLabel}>Draft</span>
              <span className={styles.chipValue}>{draft.name}</span>
            </span>
            <span className={styles.chip}>
              <span className={styles.chipLabel}>Shape</span>
              <span className={styles.chipValue}>
                {draft.shapeType === 'cylinder' ? 'Straight Cylinder' : getStyleLabel(String(preview.template.metadata.style))}
              </span>
            </span>
            <span className={styles.chip}>
              <span className={styles.chipLabel}>Material</span>
              <span className={styles.chipValue}>{draftMaterial.label}</span>
            </span>
            <span className={styles.chip}>
              <span className={styles.chipLabel}>Paper</span>
              <span className={styles.chipValue}>
                {preview.paper.label} · {getOrientationStrategyLabel(draft.orientation, preview.layout)}
              </span>
            </span>
            <span className={styles.chip}>
              <span className={styles.chipLabel}>Printable</span>
              <span className={styles.chipValue}>
                {formatLength(preview.layout.printableArea.width, unitSystem)} × {formatLength(preview.layout.printableArea.height, unitSystem)}
              </span>
            </span>
            <span className={styles.chip}>
              <span className={styles.chipLabel}>Limits</span>
              <span className={styles.chipValue}>
                {formatLength(DEFAULT_MIN_DIMENSION_MM, unitSystem)}–{formatLength(DEFAULT_MAX_DIMENSION_MM, unitSystem)}
              </span>
            </span>
            <span className={`${styles.chip} ${preview.layout.hasLegalPlacement ? styles.chipOk : styles.chipWarn}`}>
              <span className={styles.chipLabel}>Status</span>
              <span className={styles.chipValue}>
                {preview.layout.layoutType === 'multi-piece'
                  ? `${preview.layout.assemblyCount} pieces`
                  : preview.layout.hasLegalPlacement
                    ? 'Fits'
                    : 'Overflow'}
              </span>
            </span>
          </div>

          <div className={styles.previewStage}>
            <h3 className={styles.stageTitle}>Template Preview</h3>
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

          <div className={styles.previewStage}>
            <h3 className={styles.stageTitle}>3D Assembly</h3>
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
        </section>

        <aside className={styles.rightPanel}>
          <BoxWizard
            unitSystem={unitSystem}
            previewTemplate={preview.template}
            canExportPreviewPdf={canExportPreviewPdf}
            canExportPreviewSvg={canExportPreviewSvg}
            onExportPreviewPdf={exportDraftPdf}
            onExportPreviewSvg={exportDraftSvg}
            layoutStatus={preview.layoutStatus}
            messages={preview.validation.messages}
          />
        </aside>
      </main>

      <div className={styles.validationBar}>
        <div className={styles.queueToggle} role="button" tabIndex={0} onClick={() => setQueueOpen((v) => !v)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setQueueOpen((v) => !v) }}}>
          <span>{queueOpen ? '▾' : '▸'} Project Queue ({queueItems.length} item{queueItems.length !== 1 ? 's' : ''})</span>
          {queueItems.length > 0 && <span className={styles.queueToggleActions}>
            <Button size="sm" onClick={(e) => { e.stopPropagation(); exportProjectQueuePdf() }} disabled={exportableQueueItems.length === 0}>Batch PDF</Button>
          </span>}
        </div>
        {queueOpen && (
          <QueueSection
            queueItems={queueItems}
            editingQueueItemId={editingQueueItemId}
            unitSystem={unitSystem}
            onExportBatchPdf={exportProjectQueuePdf}
            onExportItemPdf={exportQueueItemPdf}
            onExportItemSvg={exportQueueItemSvg}
            onEditItem={startEditingQueueItem}
            onDuplicateItem={duplicateQueueItem}
            onRemoveItem={removeQueueItem}
            exportableCount={exportableQueueItems.length}
            buildItemPreview={(item) => buildDraftPreview(item, item.id)}
          />
        )}
      </div>
    </>
  )
}
