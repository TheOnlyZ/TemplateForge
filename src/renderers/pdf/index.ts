import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import type { Point } from '../../domain/geometry/index.ts'
import type { LayoutResult } from '../../domain/layout/index.ts'
import type { PaperDefinition } from '../../domain/paper/index.ts'
import type { CutPath, FoldLine, Tab, TemplateItem } from '../../domain/templates/index.ts'

const POINTS_PER_MM = 72 / 25.4

function mmToPt(value: number) {
  return value * POINTS_PER_MM
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

export async function exportTemplateToPdf({
  template,
  layout,
  paper,
}: TemplatePdfExportOptions) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold)
  const firstPage = layout.pages[0]
  const pageWidthMm = firstPage?.orientation === 'landscape' ? paper.heightMm : paper.widthMm
  const pageHeightMm = firstPage?.orientation === 'landscape' ? paper.widthMm : paper.heightMm

  for (const layoutPage of layout.pages) {
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

    for (const placement of layoutPage.partPlacements) {
      const placedCutPaths = template.cutPaths.map((path) => ({
        ...path,
        path: path.path.map((point) => ({
          x: point.x + placement.offsetX,
          y: point.y + placement.offsetY,
        })),
      }))
      const placedTabs = template.tabs.map((tab) => ({
        ...tab,
        outline: tab.outline.map((point) => ({
          x: point.x + placement.offsetX,
          y: point.y + placement.offsetY,
        })),
      }))
      const placedFoldLines = template.foldLines.map((line) => ({
        ...line,
        start: { x: line.start.x + placement.offsetX, y: line.start.y + placement.offsetY },
        end: { x: line.end.x + placement.offsetX, y: line.end.y + placement.offsetY },
      }))
      const placedAnnotations = template.annotations.map((annotation) => ({
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
  }

  return pdf.save()
}
