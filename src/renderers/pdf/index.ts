import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  clip,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
} from 'pdf-lib'
import type { Point } from '../../domain/geometry/index.ts'
import { layoutTemplate } from '../../domain/layout/index.ts'
import type {
  LayoutAssemblyLabel,
  LayoutAlignmentGuide,
  LayoutJoinIndicator,
  LayoutOverlapRegion,
  LayoutRegistrationMark,
  LayoutResult,
} from '../../domain/layout/index.ts'
import {
  getOrientedPaperDimensions,
  type MarginConfig,
  type OrientationPreference,
  type PaperDefinition,
} from '../../domain/paper/index.ts'
import type { CutPath, FoldLine, Tab, TemplateItem } from '../../domain/templates/index.ts'

const POINTS_PER_MM = 72 / 25.4
const REGISTRATION_MARK_HALF_SIZE_MM = 2.6

function mmToPt(value: number) {
  return value * POINTS_PER_MM
}

function drawOverlapRegion(page: PDFPage, pageHeightMm: number, region: LayoutOverlapRegion) {
  const topLeft = toPdfPoint(pageHeightMm, { x: region.bounds.minX, y: region.bounds.minY })
  page.drawRectangle({
    x: topLeft.x,
    y: topLeft.y - mmToPt(region.bounds.height),
    width: mmToPt(region.bounds.width),
    height: mmToPt(region.bounds.height),
    color: rgb(0.57, 0.66, 0.86),
    opacity: 0.06,
    borderColor: rgb(0.57, 0.66, 0.86),
    borderWidth: mmToPt(0.12),
    borderOpacity: 0.16,
  })
}

function toPdfPoint(pageHeightMm: number, point: Point) {
  return {
    x: mmToPt(point.x),
    y: mmToPt(pageHeightMm - point.y),
  }
}

function drawOpenPath(
  page: PDFPage,
  pageHeightMm: number,
  points: Point[],
  color: ReturnType<typeof rgb>,
  thicknessMm: number,
  dashArray?: number[],
) {
  if (points.length < 2) {
    return
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = toPdfPoint(pageHeightMm, points[index]!)
    const end = toPdfPoint(pageHeightMm, points[index + 1]!)
    const drawLineOptions = {
      start,
      end,
      color,
      thickness: mmToPt(thicknessMm),
      lineCap: 1,
    }

    page.drawLine(
      dashArray === undefined
        ? drawLineOptions
        : {
            ...drawLineOptions,
            dashArray,
            dashPhase: 0,
          },
    )
  }
}

function drawCutPath(page: PDFPage, pageHeightMm: number, path: CutPath) {
  drawOpenPath(page, pageHeightMm, path.path, rgb(0.12, 0.14, 0.18), 0.35)
  if (path.closed && path.path.length > 1) {
    drawOpenPath(page, pageHeightMm, [...path.path, path.path[0]!], rgb(0.12, 0.14, 0.18), 0.35)
  }
}

function drawTab(page: PDFPage, pageHeightMm: number, tab: Tab) {
  drawOpenPath(page, pageHeightMm, tab.outline, rgb(0.12, 0.14, 0.18), 0.35)
}

function drawFoldLine(page: PDFPage, pageHeightMm: number, line: FoldLine) {
  drawOpenPath(page, pageHeightMm, [line.start, line.end], rgb(0.32, 0.49, 0.96), 0.28, [5, 3])
}

function drawAlignmentGuide(page: PDFPage, pageHeightMm: number, guide: LayoutAlignmentGuide) {
  drawOpenPath(page, pageHeightMm, [guide.start, guide.end], rgb(0.61, 0.66, 0.76), 0.2, [2, 2])
}

function drawRegistrationMark(page: PDFPage, pageHeightMm: number, mark: LayoutRegistrationMark) {
  drawOpenPath(
    page,
    pageHeightMm,
    [
      { x: mark.x - REGISTRATION_MARK_HALF_SIZE_MM, y: mark.y },
      { x: mark.x + REGISTRATION_MARK_HALF_SIZE_MM, y: mark.y },
    ],
    rgb(0.76, 0.23, 0.27),
    0.24,
  )
  drawOpenPath(
    page,
    pageHeightMm,
    [
      { x: mark.x, y: mark.y - REGISTRATION_MARK_HALF_SIZE_MM },
      { x: mark.x, y: mark.y + REGISTRATION_MARK_HALF_SIZE_MM },
    ],
    rgb(0.76, 0.23, 0.27),
    0.24,
  )
}

function drawAssemblyLabel(
  page: PDFPage,
  pageHeightMm: number,
  label: LayoutAssemblyLabel,
  font: PDFFont,
) {
  const labelOrigin = toPdfPoint(pageHeightMm, { x: label.x, y: label.y })
  page.drawText(label.text, {
    x: labelOrigin.x - label.text.length * 1.85,
    y: labelOrigin.y - 3,
    size: 6.5,
    font,
    color: rgb(0.47, 0.53, 0.64),
  })
}

function drawJoinIndicator(
  page: PDFPage,
  pageHeightMm: number,
  indicator: LayoutJoinIndicator,
  font: PDFFont,
) {
  const origin = toPdfPoint(pageHeightMm, { x: indicator.x, y: indicator.y })
  page.drawText(indicator.text, {
    x: origin.x - indicator.text.length * 1.55,
    y: origin.y - 2.5,
    size: 6,
    font,
    color: rgb(0.21, 0.29, 0.46),
  })
}

function drawCalibrationBlock(
  page: PDFPage,
  pageHeightMm: number,
  font: PDFFont,
  anchorX: number,
  anchorY: number,
) {
  const rulerStart = { x: anchorX, y: anchorY }
  const rulerMid = { x: anchorX + 50, y: anchorY }
  const rulerEnd = { x: anchorX + 100, y: anchorY }
  const inchStart = { x: anchorX, y: anchorY + 8 }
  const inchMid = { x: anchorX + 25.4, y: anchorY + 8 }
  const inchEnd = { x: anchorX + 50.8, y: anchorY + 8 }

  drawOpenPath(page, pageHeightMm, [rulerStart, rulerEnd], rgb(0.12, 0.14, 0.18), 0.3)
  drawOpenPath(page, pageHeightMm, [{ x: rulerStart.x, y: rulerStart.y - 2 }, { x: rulerStart.x, y: rulerStart.y + 2 }], rgb(0.12, 0.14, 0.18), 0.3)
  drawOpenPath(page, pageHeightMm, [{ x: rulerMid.x, y: rulerMid.y - 2 }, { x: rulerMid.x, y: rulerMid.y + 2 }], rgb(0.12, 0.14, 0.18), 0.3)
  drawOpenPath(page, pageHeightMm, [{ x: rulerEnd.x, y: rulerEnd.y - 2 }, { x: rulerEnd.x, y: rulerEnd.y + 2 }], rgb(0.12, 0.14, 0.18), 0.3)
  drawOpenPath(page, pageHeightMm, [inchStart, inchEnd], rgb(0.12, 0.14, 0.18), 0.3)
  drawOpenPath(page, pageHeightMm, [{ x: inchMid.x, y: inchMid.y - 2 }, { x: inchMid.x, y: inchMid.y + 2 }], rgb(0.12, 0.14, 0.18), 0.3)
  drawOpenPath(page, pageHeightMm, [{ x: inchEnd.x, y: inchEnd.y - 2 }, { x: inchEnd.x, y: inchEnd.y + 2 }], rgb(0.12, 0.14, 0.18), 0.3)

  const metricLabel = toPdfPoint(pageHeightMm, { x: anchorX, y: anchorY - 4 })
  page.drawText('50 mm', { x: metricLabel.x + mmToPt(16), y: metricLabel.y, size: 7, font })
  page.drawText('100 mm', { x: metricLabel.x + mmToPt(58), y: metricLabel.y, size: 7, font })
  const imperialLabel = toPdfPoint(pageHeightMm, { x: anchorX, y: anchorY + 4 })
  page.drawText('1 in', { x: imperialLabel.x + mmToPt(8), y: imperialLabel.y, size: 7, font })
  page.drawText('2 in', { x: imperialLabel.x + mmToPt(32), y: imperialLabel.y, size: 7, font })
}

export interface TemplatePdfExportOptions {
  template: TemplateItem
  layout: LayoutResult
  paper: PaperDefinition
}

export interface ProjectPdfExportItem extends TemplatePdfExportOptions {
  id: string
  orientation: OrientationPreference
  margins: MarginConfig
}

function buildProjectGroupKey(item: ProjectPdfExportItem) {
  return [
    item.paper.id,
    item.orientation,
    item.margins.top,
    item.margins.right,
    item.margins.bottom,
    item.margins.left,
  ].join(':')
}

function buildProjectGroupName(items: ProjectPdfExportItem[]) {
  if (items.length === 1) {
    return items[0]!.template.name
  }

  return `${items[0]!.paper.label} Project Batch (${items.length} items)`
}

function mergeProjectGroupTemplates(items: ProjectPdfExportItem[]): TemplateItem {
  return {
    id: `project-batch:${items.map((item) => item.id).join(':')}`,
    version: 1,
    name: buildProjectGroupName(items),
    shapeType:
      items.every((item) => item.template.shapeType === items[0]!.template.shapeType)
        ? items[0]!.template.shapeType
        : 'mixed-project',
    dimensionsMm: Object.fromEntries(
      items.flatMap((item) =>
        Object.entries(item.template.dimensionsMm).map(([key, value]) => [`${item.id}.${key}`, value]),
      ),
    ),
    parts: items.flatMap((item) => item.template.parts),
    panels: items.flatMap((item) => item.template.panels),
    cutPaths: items.flatMap((item) => item.template.cutPaths),
    foldLines: items.flatMap((item) => item.template.foldLines),
    tabs: items.flatMap((item) => item.template.tabs),
    joinEdges: items.flatMap((item) => item.template.joinEdges),
    annotations: items.flatMap((item) => item.template.annotations),
    splitCandidates: items.flatMap((item) => item.template.splitCandidates),
    assemblyNotes: items.flatMap((item) => item.template.assemblyNotes),
    pages: [],
    metadata: {
      groupedExport: true,
      itemCount: items.length,
      paperSizeId: items[0]!.paper.id,
    },
  }
}

function groupProjectPdfItems(items: ProjectPdfExportItem[]) {
  const groups = new Map<string, ProjectPdfExportItem[]>()

  for (const item of items) {
    const key = buildProjectGroupKey(item)
    const existing = groups.get(key)

    if (existing) {
      existing.push(item)
      continue
    }

    groups.set(key, [item])
  }

  return [...groups.values()]
}

export async function exportTemplateToPdf({
  template,
  layout,
  paper,
}: TemplatePdfExportOptions) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold)
  const partsById = new Map(template.parts.map((part) => [part.id, part]))

  for (const layoutPage of layout.pages) {
    const { widthMm: pageWidthMm, heightMm: pageHeightMm } = getOrientedPaperDimensions(
      paper,
      layoutPage.orientation,
    )
    const page = pdf.addPage([mmToPt(pageWidthMm), mmToPt(pageHeightMm)])
    const headerOrigin = toPdfPoint(pageHeightMm, { x: 8, y: 8 })
    page.drawText(template.name, {
      x: headerOrigin.x,
      y: headerOrigin.y,
      size: 12,
      font: boldFont,
      color: rgb(0.12, 0.14, 0.18),
    })
    const subtitleOrigin = toPdfPoint(pageHeightMm, { x: 8, y: 14 })
    page.drawText(
      `${paper.label} • ${layoutPage.orientation} • Page ${layoutPage.pageNumber} of ${layout.pageCount}`,
      {
        x: subtitleOrigin.x,
        y: subtitleOrigin.y,
        size: 8,
        font,
        color: rgb(0.35, 0.41, 0.5),
      },
    )
    const instructionOrigin = toPdfPoint(pageHeightMm, { x: 8, y: 20 })
    page.drawText('Print at actual size. Disable fit-to-page. Measure the rulers before cutting.', {
      x: instructionOrigin.x,
      y: instructionOrigin.y,
      size: 7,
      font,
      color: rgb(0.35, 0.41, 0.5),
    })

    const printableBounds = layoutPage.printableBounds
    const printableTopLeft = toPdfPoint(pageHeightMm, {
      x: printableBounds.minX,
      y: printableBounds.minY,
    })
    page.drawRectangle({
      x: printableTopLeft.x,
      y: printableTopLeft.y - mmToPt(printableBounds.height),
      width: mmToPt(printableBounds.width),
      height: mmToPt(printableBounds.height),
      borderColor: rgb(0.82, 0.84, 0.88),
      borderWidth: mmToPt(0.2),
      opacity: 0,
    })
    page.pushOperators(
      pushGraphicsState(),
      rectangle(
        printableTopLeft.x,
        printableTopLeft.y - mmToPt(printableBounds.height),
        mmToPt(printableBounds.width),
        mmToPt(printableBounds.height),
      ),
      clip(),
      endPath(),
    )

    for (const region of layoutPage.overlapRegions) {
      drawOverlapRegion(page, pageHeightMm, region)
    }

    for (const guide of layoutPage.alignmentGuides) {
      drawAlignmentGuide(page, pageHeightMm, guide)
    }

    for (const mark of layoutPage.registrationMarks) {
      drawRegistrationMark(page, pageHeightMm, mark)
    }

    for (const label of layoutPage.assemblyLabels) {
      drawAssemblyLabel(page, pageHeightMm, label, font)
    }

    for (const indicator of layoutPage.joinIndicators) {
      drawJoinIndicator(page, pageHeightMm, indicator, font)
    }

    for (const placement of layoutPage.partPlacements) {
      const part = partsById.get(placement.partId)
      if (!part) {
        continue
      }

      const partTargetIds = new Set([
        part.id,
        ...part.panelIds,
        ...part.cutPathIds,
        ...part.foldLineIds,
        ...part.tabIds,
        ...part.joinEdgeIds,
      ])
      const placedCutPaths = template.cutPaths.filter((path) => path.partId === part.id).map((path) => ({
        ...path,
        path: path.path.map((point) => ({
          x: point.x + placement.offsetX,
          y: point.y + placement.offsetY,
        })),
      }))
      const placedTabs = template.tabs.filter((tab) => tab.partId === part.id).map((tab) => ({
        ...tab,
        outline: tab.outline.map((point) => ({
          x: point.x + placement.offsetX,
          y: point.y + placement.offsetY,
        })),
      }))
      const placedFoldLines = template.foldLines.filter((line) => line.partId === part.id).map((line) => ({
        ...line,
        start: { x: line.start.x + placement.offsetX, y: line.start.y + placement.offsetY },
        end: { x: line.end.x + placement.offsetX, y: line.end.y + placement.offsetY },
      }))
      const placedAnnotations = template.annotations
        .filter(
          (annotation) =>
            annotation.targetIds.length === 0 ||
            annotation.targetIds.some((targetId) => partTargetIds.has(targetId)),
        )
        .map((annotation) => ({
          ...annotation,
          position: {
            x: annotation.position.x + placement.offsetX,
            y: annotation.position.y + placement.offsetY,
          },
        }))

      for (const path of placedCutPaths) {
        drawCutPath(page, pageHeightMm, path)
      }

      for (const tab of placedTabs) {
        drawTab(page, pageHeightMm, tab)
      }

      for (const foldLine of placedFoldLines) {
        drawFoldLine(page, pageHeightMm, foldLine)
      }

      for (const annotation of placedAnnotations) {
        const annotationOrigin = toPdfPoint(pageHeightMm, annotation.position)
        page.drawText(annotation.text, {
          x: annotationOrigin.x - annotation.text.length * 1.9,
          y: annotationOrigin.y - 3,
          size: 7,
          font,
          color: rgb(0.25, 0.28, 0.34),
        })
      }
    }

    drawCalibrationBlock(page, pageHeightMm, font, printableBounds.minX + 8, printableBounds.maxY - 16)
    page.pushOperators(popGraphicsState())
  }

  return pdf.save()
}

export async function exportProjectToPdf(items: ProjectPdfExportItem[]) {
  const pdf = await PDFDocument.create()

  for (const groupItems of groupProjectPdfItems(items)) {
    const firstItem = groupItems[0]!
    const sourceTemplate =
      groupItems.length === 1 ? firstItem.template : mergeProjectGroupTemplates(groupItems)
    const sourceLayout =
      groupItems.length === 1
        ? firstItem.layout
        : layoutTemplate(sourceTemplate, firstItem.paper, firstItem.orientation, firstItem.margins)
    const sourcePdf = await PDFDocument.load(
      await exportTemplateToPdf({
        template: sourceTemplate,
        layout: sourceLayout,
        paper: firstItem.paper,
      }),
    )
    const sourcePages = await pdf.copyPages(sourcePdf, sourcePdf.getPageIndices())

    for (const page of sourcePages) {
      pdf.addPage(page)
    }
  }

  return pdf.save()
}
