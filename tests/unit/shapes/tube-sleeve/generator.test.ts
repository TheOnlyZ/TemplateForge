import { describe, expect, it } from 'vitest'
import {
  generateSleeveTemplate,
  generateTubeTemplate,
} from '../../../../src/domain/shapes/tube-sleeve/index.ts'

describe('tube and sleeve generators', () => {
  it('builds an open-ended tube with a glue seam and seam metadata', () => {
    const result = generateTubeTemplate(
      {
        diameterMm: 64,
        heightMm: 120,
      },
      {
        itemId: 'tube-1',
        itemName: 'Sample Tube',
      },
    )

    expect(result.template.shapeType).toBe('tube')
    expect(result.template.parts).toHaveLength(1)
    expect(result.template.panels.map((panel) => panel.name)).toEqual(['Tube Body'])
    expect(result.template.tabs.some((tab) => tab.label === 'Glue Seam')).toBe(true)
    expect(result.template.joinEdges).toHaveLength(2)
    expect(result.template.metadata.profile).toBe('tube')
  })

  it('builds an open-ended sleeve with a fold-over overlap panel', () => {
    const result = generateSleeveTemplate(
      {
        diameterMm: 70,
        heightMm: 90,
        overlapMm: 18,
      },
      {
        itemId: 'sleeve-1',
        itemName: 'Sample Sleeve',
      },
    )

    expect(result.template.shapeType).toBe('sleeve')
    expect(result.template.panels.map((panel) => panel.name)).toEqual(['Body Sleeve', 'Overlap Sleeve'])
    expect(result.template.foldLines).toHaveLength(1)
    expect(result.template.tabs).toHaveLength(0)
    expect(result.template.metadata.profile).toBe('sleeve')
  })

  it('keeps generation deterministic for identical tube inputs', () => {
    const first = generateTubeTemplate(
      {
        diameterMm: 72,
        heightMm: 96,
      },
      {
        itemId: 'tube-2',
        itemName: 'Deterministic Tube',
      },
    )
    const second = generateTubeTemplate(
      {
        diameterMm: 72,
        heightMm: 96,
      },
      {
        itemId: 'tube-2',
        itemName: 'Deterministic Tube',
      },
    )

    expect(second.template).toEqual(first.template)
  })
})
