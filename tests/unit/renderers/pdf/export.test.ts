import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { layoutTemplate } from '../../../../src/domain/layout/index.ts'
import { getDefaultMarginConfig, getPaperDefinition } from '../../../../src/domain/paper/index.ts'
import { generateBoxTemplate } from '../../../../src/domain/shapes/box/index.ts'
import { generateConeTemplate } from '../../../../src/domain/shapes/cone/index.ts'
import { generateCustomParametricShapeTemplate } from '../../../../src/domain/shapes/custom-parametric/index.ts'
import { generateCylinderTemplate } from '../../../../src/domain/shapes/cylinder/index.ts'
import { generateDrawerBoxTemplate } from '../../../../src/domain/shapes/drawer-telescoping/index.ts'
import { generatePolygonalPrismTemplate } from '../../../../src/domain/shapes/polygonal-prism/index.ts'
import { generateTubeTemplate } from '../../../../src/domain/shapes/tube-sleeve/index.ts'
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

  it('exports a generated cone template through the same layout and PDF pipeline', async () => {
    const paper = getPaperDefinition('a4')
    const { template } = generateConeTemplate(
      {
        baseDiameterMm: 60,
        heightMm: 80,
      },
      {
        itemId: 'pdf-cone',
        itemName: 'PDF Cone',
      },
    )
    const layout = layoutTemplate(template, paper, 'auto', getDefaultMarginConfig())

    expect(layout.hasLegalPlacement).toBe(true)

    const bytes = await exportTemplateToPdf({ template, layout, paper })
    const pdf = await PDFDocument.load(bytes)

    expect(pdf.getPageCount()).toBe(1)
  })

  it('exports a generated polygonal prism template through the same layout and PDF pipeline', async () => {
    const paper = getPaperDefinition('a4')
    const { template } = generatePolygonalPrismTemplate(
      {
        sideCount: 6,
        sideLengthMm: 26,
        heightMm: 60,
      },
      {
        itemId: 'pdf-prism',
        itemName: 'PDF Prism',
      },
    )
    const layout = layoutTemplate(template, paper, 'auto', getDefaultMarginConfig())

    expect(layout.hasLegalPlacement).toBe(true)

    const bytes = await exportTemplateToPdf({ template, layout, paper })
    const pdf = await PDFDocument.load(bytes)

    expect(pdf.getPageCount()).toBe(1)
  })

  it('exports a generated tube template through the same layout and PDF pipeline', async () => {
    const paper = getPaperDefinition('a4')
    const { template } = generateTubeTemplate(
      {
        diameterMm: 60,
        heightMm: 100,
      },
      {
        itemId: 'pdf-tube',
        itemName: 'PDF Tube',
      },
    )
    const layout = layoutTemplate(template, paper, 'auto', getDefaultMarginConfig())

    expect(layout.hasLegalPlacement).toBe(true)

    const bytes = await exportTemplateToPdf({ template, layout, paper })
    const pdf = await PDFDocument.load(bytes)

    expect(pdf.getPageCount()).toBe(1)
  })

  it('exports a generated drawer box template through the same layout and PDF pipeline', async () => {
    const paper = getPaperDefinition('a4')
    const { template } = generateDrawerBoxTemplate(
      {
        externalLengthMm: 90,
        externalWidthMm: 60,
        externalHeightMm: 18,
        glueTabWidthMm: 12,
      },
      {
        itemId: 'pdf-drawer-box',
        itemName: 'PDF Drawer Box',
      },
    )
    const layout = layoutTemplate(template, paper, 'auto', getDefaultMarginConfig())

    expect(layout.hasLegalPlacement).toBe(true)

    const bytes = await exportTemplateToPdf({ template, layout, paper })
    const pdf = await PDFDocument.load(bytes)

    expect(pdf.getPageCount()).toBe(1)
  })

  it('exports a generated custom parametric shape through the same layout and PDF pipeline', async () => {
    const paper = getPaperDefinition('a4')
    const { template } = generateCustomParametricShapeTemplate(
      {
        partName: 'PDF Custom Strip',
        panelHeightMm: 58,
        glueTabWidthMm: 12,
        topTabDepthMm: 12,
        panels: [
          { name: 'Panel A', widthMm: 46 },
          { name: 'Panel B', widthMm: 34 },
          { name: 'Panel C', widthMm: 46 },
        ],
      },
      {
        itemId: 'pdf-custom-shape',
        itemName: 'PDF Custom Shape',
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

  it('returns overflow result for templates that do not fit the printable area', async () => {
    const paper = getPaperDefinition('a4')
    const template = createOversizedTemplate(320, 430)
    const layout = layoutTemplate(template, paper, 'portrait', getDefaultMarginConfig())

    expect(layout.hasLegalPlacement).toBe(false)
    expect(layout.printableAreaOverflow).toBe(true)
    expect(layout.pageCount).toBe(0)
  })

  it('nests compatible queued items onto shared pages during batch export', async () => {
    const paper = getPaperDefinition('a4')
    const margins = getDefaultMarginConfig()
    const { template: firstTemplate } = generateBoxTemplate(
      {
        externalLengthMm: 80,
        externalWidthMm: 50,
        externalHeightMm: 16,
        glueTabWidthMm: 10,
        style: 'open-tray',
      },
      {
        itemId: 'batch-box-1',
        itemName: 'Batch Box 1',
      },
    )
    const { template: secondTemplate } = generateBoxTemplate(
      {
        externalLengthMm: 90,
        externalWidthMm: 60,
        externalHeightMm: 18,
        glueTabWidthMm: 10,
        style: 'open-tray',
      },
      {
        itemId: 'batch-box-2',
        itemName: 'Batch Box 2',
      },
    )
    const firstLayout = layoutTemplate(firstTemplate, paper, 'auto', margins)
    const secondLayout = layoutTemplate(secondTemplate, paper, 'auto', margins)

    const bytes = await exportProjectToPdf([
      {
        id: 'queue-item-1',
        template: firstTemplate,
        layout: firstLayout,
        paper,
        orientation: 'auto',
        margins,
      },
      {
        id: 'queue-item-2',
        template: secondTemplate,
        layout: secondLayout,
        paper,
        orientation: 'auto',
        margins,
      },
    ])
    const pdf = await PDFDocument.load(bytes)

    expect(pdf.getPageCount()).toBeLessThan(firstLayout.pageCount + secondLayout.pageCount)
  })
})
