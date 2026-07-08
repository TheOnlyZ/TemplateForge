import { describe, expect, it } from 'vitest'
import type { TemplateItem, TemplatePart } from '../../../src/domain/templates/index.ts'
import { layoutTemplate } from '../../../src/domain/layout/index.ts'
import { getDefaultMarginConfig, getPaperDefinition } from '../../../src/domain/paper/index.ts'
import { generateBoxTemplate } from '../../../src/domain/shapes/box/index.ts'

function createTemplatePart(id: string, width: number, height: number): TemplatePart {
  return {
    id,
    name: id,
    panelIds: [],
    cutPathIds: [],
    foldLineIds: [],
    tabIds: [],
    joinEdgeIds: [],
    bounds: {
      minX: 0,
      minY: 0,
      maxX: width,
      maxY: height,
      width,
      height,
    },
  }
}

function createMultiPartTemplate(parts: TemplatePart[]): TemplateItem {
  return {
    id: 'layout-multipart',
    version: 1,
    name: 'Layout Multipart',
    shapeType: 'box',
    dimensionsMm: {},
    parts,
    panels: [],
    cutPaths: [],
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

describe('layoutTemplate', () => {
  it('places a box on a single page when it fits the printable area', () => {
    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 100,
        externalWidthMm: 70,
        externalHeightMm: 20,
        glueTabWidthMm: 12,
        style: 'open-tray',
      },
      {
        itemId: 'layout-fit',
        itemName: 'Layout Fit',
      },
    )

    const result = layoutTemplate(template, getPaperDefinition('a4'), 'portrait', getDefaultMarginConfig())

    expect(result.hasLegalPlacement).toBe(true)
    expect(result.pageCount).toBe(1)
    expect(result.pages[0]?.partPlacements).toHaveLength(1)
  })

  it('returns overflow result when layout does not fit the printable area', () => {
    const template = createMultiPartTemplate([createTemplatePart('oversized-part', 320, 430)])

    const result = layoutTemplate(template, getPaperDefinition('a4'), 'portrait', getDefaultMarginConfig())

    expect(result.hasLegalPlacement).toBe(false)
    expect(result.printableAreaOverflow).toBe(true)
    expect(result.pageCount).toBe(0)
    expect(result.pages).toHaveLength(0)
  })

  it('automatically selects landscape when portrait would overflow', () => {
    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 150,
        externalWidthMm: 95,
        externalHeightMm: 28,
        glueTabWidthMm: 12,
        style: 'open-tray',
      },
      {
        itemId: 'layout-auto-landscape',
        itemName: 'Layout Auto Landscape',
      },
    )

    const result = layoutTemplate(template, getPaperDefinition('a4'), 'auto', getDefaultMarginConfig())

    expect(result.hasLegalPlacement).toBe(true)
    expect(result.pageCount).toBe(1)
    expect(result.pages[0]?.orientation).toBe('landscape')
    expect(result.pages[0]?.registrationMarks).toHaveLength(0)
    expect(result.pages[0]?.assemblyLabels).toHaveLength(0)
    expect(result.pages[0]?.joinIndicators).toHaveLength(0)
    expect(result.pages[0]?.overlapRegions).toHaveLength(0)
  })

  it('optimizes multi-part placement so paired rows fit where a simple vertical stack would not', () => {
    const template = createMultiPartTemplate([
      createTemplatePart('wide-1', 120, 70),
      createTemplatePart('wide-2', 120, 70),
      createTemplatePart('wide-3', 120, 70),
      createTemplatePart('narrow-1', 60, 70),
      createTemplatePart('narrow-2', 60, 70),
      createTemplatePart('narrow-3', 60, 70),
    ])

    const result = layoutTemplate(template, getPaperDefinition('a4'), 'portrait', getDefaultMarginConfig())

    expect(result.hasLegalPlacement).toBe(true)
    expect(result.pageCount).toBe(1)
    expect(result.pages[0]?.partPlacements).toHaveLength(6)

    const rowStarts = new Set(
      result.pages[0]?.partPlacements.map((placement) => Math.round(placement.offsetY + placement.bounds.minY)),
    )
    const rowOccupancy = Array.from(rowStarts).map(
      (rowStart) =>
        result.pages[0]?.partPlacements.filter(
          (placement) => Math.round(placement.offsetY + placement.bounds.minY) === rowStart,
        ).length ?? 0,
    )

    expect(rowStarts.size).toBe(3)
    expect(Math.max(...rowOccupancy)).toBeGreaterThan(1)
  })

  it('fits taller layouts on a single Legal page when Letter overflows', () => {
    const template = createMultiPartTemplate([createTemplatePart('tall-part', 190, 320)])

    const letterLayout = layoutTemplate(
      template,
      getPaperDefinition('letter'),
      'portrait',
      getDefaultMarginConfig(),
    )
    const legalLayout = layoutTemplate(
      template,
      getPaperDefinition('legal'),
      'portrait',
      getDefaultMarginConfig(),
    )

    expect(letterLayout.printableAreaOverflow).toBe(true)
    expect(letterLayout.pageCount).toBe(0)
    expect(legalLayout.hasLegalPlacement).toBe(true)
    expect(legalLayout.pageCount).toBe(1)
    expect(legalLayout.pages[0]?.paperSizeId).toBe('legal')
  })
})
