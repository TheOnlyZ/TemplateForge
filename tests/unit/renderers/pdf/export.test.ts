import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { layoutTemplate } from '../../../../src/domain/layout/index.ts'
import { getDefaultMarginConfig, getPaperDefinition } from '../../../../src/domain/paper/index.ts'
import { generateBoxTemplate } from '../../../../src/domain/shapes/box/index.ts'
import { generateCylinderTemplate } from '../../../../src/domain/shapes/cylinder/index.ts'
import type { TemplateItem } from '../../../../src/domain/templates/index.ts'
import { exportProjectToPdf, exportTemplateToPdf } from '../../../../src/renderers/pdf/index.ts'

const POINTS_PER_MM = 72 / 25.4

function mmToPt(value: number) {
  return value * POINTS_PER_MM
}

function createOversizedTemplate(width: number, height: number): TemplateItem {
  return {
    id: 'oversized-template',
    version: 1,
    name: 'Oversized Template',
    shapeType: 'box',
    dimensionsMm: { width, height },
    parts: [
      {
        id: 'part-main',
        name: 'Main Part',
        panelIds: [],
        cutPathIds: ['cut-outline'],
        foldLineIds: [],
        tabIds: [],
        joinEdgeIds: [],
        bounds: { minX: 0, minY: 0, maxX: width, maxY: height, width, height },
      },
    ],
    panels: [],
    cutPaths: [
      {
        id: 'cut-outline',
        partId: 'part-main',
        path: [
          { x: 0, y: 0 },
          { x: width, y: 0 },
          { x: width, y: height },
          { x: 0, y: height },
        ],
        style: 'solid',
        closed: true,
      },
    ],
    foldLines: [],
    tabs: [],
    joinEdges: [],
    annotations: [],
    splitCandidates: [],
    assemblyNotes: [],
    pages: [],
    metadata: {},
  }
}

describe('exportTemplateToPdf', () => {
  it('creates a readable single-page PDF from the canonical template and layout', async () => {
    const paper = getPaperDefinition('a4')
    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 100,
        externalWidthMm: 70,
        externalHeightMm: 20,
        glueTabWidthMm: 12,
        style: 'open-tray',
      },
      {
        itemId: 'pdf-box',
        itemName: 'PDF Box',
      },
    )
    const layout = layoutTemplate(template, paper, 'auto', getDefaultMarginConfig())

    const bytes = await exportTemplateToPdf({ template, layout, paper })
    const pdf = await PDFDocument.load(bytes)

    expect(pdf.getPageCount()).toBe(1)
  })

  it('exports a generated cylinder template through the same layout and PDF pipeline', async () => {
    const paper = getPaperDefinition('a4')
    const { template } = generateCylinderTemplate(
      {
        diameterMm: 60,
        heightMm: 100,
      },
      {
        itemId: 'pdf-cylinder',
        itemName: 'PDF Cylinder',
      },
    )
    const layout = layoutTemplate(template, paper, 'auto', getDefaultMarginConfig())

    expect(layout.hasLegalPlacement).toBe(true)

    const bytes = await exportTemplateToPdf({ template, layout, paper })
    const pdf = await PDFDocument.load(bytes)

    expect(pdf.getPageCount()).toBe(1)
  })

  it('uses the correct page sizes for Letter and Legal exports', async () => {
    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 120,
        externalWidthMm: 80,
        externalHeightMm: 24,
        glueTabWidthMm: 12,
        style: 'open-tray',
      },
      {
        itemId: 'pdf-paper-sizes',
        itemName: 'PDF Paper Sizes',
      },
    )
    const letterPaper = getPaperDefinition('letter')
    const letterLayout = layoutTemplate(template, letterPaper, 'portrait', getDefaultMarginConfig())
    const letterPdf = await PDFDocument.load(
      await exportTemplateToPdf({ template, layout: letterLayout, paper: letterPaper }),
    )
    const legalPaper = getPaperDefinition('legal')
    const legalLayout = layoutTemplate(template, legalPaper, 'landscape', getDefaultMarginConfig())
    const legalPdf = await PDFDocument.load(
      await exportTemplateToPdf({ template, layout: legalLayout, paper: legalPaper }),
    )

    expect(letterPdf.getPage(0)?.getWidth()).toBeCloseTo(mmToPt(215.9), 1)
    expect(letterPdf.getPage(0)?.getHeight()).toBeCloseTo(mmToPt(279.4), 1)
    expect(legalPdf.getPage(0)?.getWidth()).toBeCloseTo(mmToPt(355.6), 1)
    expect(legalPdf.getPage(0)?.getHeight()).toBeCloseTo(mmToPt(215.9), 1)
  })

  it('exports oversized templates as multiple tiled PDF pages', async () => {
    const paper = getPaperDefinition('a4')
    const template = createOversizedTemplate(320, 430)
    const layout = layoutTemplate(template, paper, 'portrait', getDefaultMarginConfig())

    expect(layout.hasLegalPlacement).toBe(true)
    expect(layout.pageCount).toBe(4)
    expect(layout.pages.every((page) => page.registrationMarks.length > 0)).toBe(true)
    expect(layout.pages.every((page) => page.assemblyLabels.length > 0)).toBe(true)
    expect(layout.pages.every((page) => page.joinIndicators.length > 0)).toBe(true)
    expect(layout.pages.every((page) => page.overlapRegions.length > 0)).toBe(true)

    const bytes = await exportTemplateToPdf({ template, layout, paper })
    const pdf = await PDFDocument.load(bytes)

    expect(pdf.getPageCount()).toBe(4)
  })

  it('combines multiple queued template exports into a single batch PDF', async () => {
    const firstPaper = getPaperDefinition('a4')
    const secondPaper = getPaperDefinition('letter')
    const { template: firstTemplate } = generateBoxTemplate(
      {
        externalLengthMm: 100,
        externalWidthMm: 70,
        externalHeightMm: 20,
        glueTabWidthMm: 12,
        style: 'open-tray',
      },
      {
        itemId: 'batch-box-1',
        itemName: 'Batch Box 1',
      },
    )
    const { template: secondTemplate } = generateCylinderTemplate(
      {
        diameterMm: 60,
        heightMm: 100,
      },
      {
        itemId: 'batch-cylinder-1',
        itemName: 'Batch Cylinder 1',
      },
    )
    const firstLayout = layoutTemplate(firstTemplate, firstPaper, 'auto', getDefaultMarginConfig())
    const secondLayout = layoutTemplate(secondTemplate, secondPaper, 'auto', getDefaultMarginConfig())

    const bytes = await exportProjectToPdf([
      {
        id: 'queue-item-1',
        template: firstTemplate,
        layout: firstLayout,
        paper: firstPaper,
      },
      {
        id: 'queue-item-2',
        template: secondTemplate,
        layout: secondLayout,
        paper: secondPaper,
      },
    ])
    const pdf = await PDFDocument.load(bytes)

    expect(pdf.getPageCount()).toBe(firstLayout.pageCount + secondLayout.pageCount)
  })
})
