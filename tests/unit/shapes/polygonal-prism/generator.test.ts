import { describe, expect, it } from 'vitest'
import { generatePolygonalPrismTemplate } from '../../../../src/domain/shapes/polygonal-prism/index.ts'

describe('generatePolygonalPrismTemplate', () => {
  it('builds a regular hexagonal prism template with side panels, caps, seam, and cap tabs', () => {
    const result = generatePolygonalPrismTemplate(
      {
        sideCount: 6,
        sideLengthMm: 34,
        heightMm: 80,
      },
      {
        itemId: 'prism-1',
        itemName: 'Hex Prism',
      },
    )

    expect(result.template.shapeType).toBe('polygonal-prism')
    expect(result.template.parts).toHaveLength(1)
    expect(result.template.panels).toHaveLength(8)
    expect(result.template.panels[0]?.name).toBe('Face 1')
    expect(result.template.panels.at(-1)?.name).toBe('Top Cap')
    expect(result.template.tabs.some((tab) => tab.label === 'Glue Seam')).toBe(true)
    expect(result.template.tabs.length).toBe(13)
    expect(result.template.joinEdges).toHaveLength(2)
    expect(result.template.foldLines.some((line) => line.id.includes('glue-seam'))).toBe(true)
    expect(result.template.metadata.profile).toBe('polygonal-prism')
  })

  it('supports smaller polygon counts like triangular prisms', () => {
    const result = generatePolygonalPrismTemplate(
      {
        sideCount: 3,
        sideLengthMm: 50,
        heightMm: 100,
      },
      {
        itemId: 'prism-2',
        itemName: 'Triangular Prism',
      },
    )

    expect(result.template.panels.map((panel) => panel.name)).toEqual([
      'Face 1',
      'Face 2',
      'Face 3',
      'Base Cap',
      'Top Cap',
    ])
    expect(result.template.foldLines.length).toBe(9)
  })

  it('keeps generation deterministic for identical inputs', () => {
    const first = generatePolygonalPrismTemplate(
      {
        sideCount: 8,
        sideLengthMm: 26,
        heightMm: 72,
      },
      {
        itemId: 'prism-3',
        itemName: 'Deterministic Prism',
      },
    )
    const second = generatePolygonalPrismTemplate(
      {
        sideCount: 8,
        sideLengthMm: 26,
        heightMm: 72,
      },
      {
        itemId: 'prism-3',
        itemName: 'Deterministic Prism',
      },
    )

    expect(second.template).toEqual(first.template)
  })
})
