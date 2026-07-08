import { describe, expect, it } from 'vitest'
import {
  generateConeTemplate,
  generateTruncatedConeTemplate,
} from '../../../../src/domain/shapes/cone/index.ts'

describe('cone generators', () => {
  it('builds a cone template with a body, base cap, and glue seam metadata', () => {
    const result = generateConeTemplate(
      {
        baseDiameterMm: 90,
        heightMm: 120,
      },
      {
        itemId: 'cone-1',
        itemName: 'Sample Cone',
      },
    )

    expect(result.template.shapeType).toBe('cone')
    expect(result.template.parts).toHaveLength(1)
    expect(result.template.panels.map((panel) => panel.name)).toEqual(['Cone Body', 'Base Cap'])
    expect(result.template.tabs.some((tab) => tab.label === 'Glue Seam')).toBe(true)
    expect(result.template.foldLines).toHaveLength(1)
    expect(result.template.joinEdges).toHaveLength(2)
    expect(result.template.metadata.profile).toBe('cone')
  })

  it('builds a truncated cone template with top and base caps', () => {
    const result = generateTruncatedConeTemplate(
      {
        baseDiameterMm: 110,
        topDiameterMm: 48,
        heightMm: 90,
      },
      {
        itemId: 'frustum-1',
        itemName: 'Sample Frustum',
      },
    )

    expect(result.template.panels.map((panel) => panel.name)).toEqual([
      'Frustum Body',
      'Base Cap',
      'Top Cap',
    ])
    expect(result.template.cutPaths.some((path) => path.id.includes('top-cap'))).toBe(true)
    expect(result.template.metadata.profile).toBe('truncated-cone')
  })

  it('keeps generation deterministic for identical inputs', () => {
    const first = generateTruncatedConeTemplate(
      {
        baseDiameterMm: 120,
        topDiameterMm: 40,
        heightMm: 100,
      },
      {
        itemId: 'frustum-2',
        itemName: 'Deterministic Frustum',
      },
    )
    const second = generateTruncatedConeTemplate(
      {
        baseDiameterMm: 120,
        topDiameterMm: 40,
        heightMm: 100,
      },
      {
        itemId: 'frustum-2',
        itemName: 'Deterministic Frustum',
      },
    )

    expect(second.template).toEqual(first.template)
  })
})
