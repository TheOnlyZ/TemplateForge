import { describe, expect, it } from 'vitest'
import { generateCylinderTemplate } from '../../../../src/domain/shapes/cylinder/index.ts'

describe('generateCylinderTemplate', () => {
  it('builds a straight cylinder template with a wrap panel, two cap panels, and seam metadata', () => {
    const result = generateCylinderTemplate(
      {
        diameterMm: 64,
        heightMm: 110,
      },
      {
        itemId: 'cylinder-1',
        itemName: 'Sample Cylinder',
      },
    )

    const bodyPanel = result.template.panels.find((panel) => panel.name === 'Body Wrap')

    expect(result.template.shapeType).toBe('cylinder')
    expect(result.template.parts).toHaveLength(1)
    expect(result.template.panels).toHaveLength(3)
    expect(result.template.cutPaths.length).toBeGreaterThan(3)
    expect(result.template.tabs.some((tab) => tab.label === 'Glue Seam')).toBe(true)
    expect(result.template.tabs.some((tab) => tab.label?.startsWith('Top Alignment Tab'))).toBe(true)
    expect(result.template.tabs.some((tab) => tab.label?.startsWith('Bottom Alignment Tab'))).toBe(true)
    expect(result.template.foldLines.some((line) => line.id.includes('glue-seam'))).toBe(true)
    expect(result.template.foldLines.length).toBe(result.template.tabs.length)
    expect(result.template.joinEdges).toHaveLength(2)
    expect(result.template.joinEdges[0]?.partnerId).toBe(result.template.joinEdges[1]?.id)
    expect(result.template.joinEdges[1]?.partnerId).toBe(result.template.joinEdges[0]?.id)
    expect(bodyPanel?.bounds.width).toBeCloseTo(Math.PI * 64, 3)
    expect(result.template.annotations.map((annotation) => annotation.text)).toContain('Top Cap')
    expect(result.template.metadata.alignmentTabCount).toBeGreaterThanOrEqual(2)
    expect(result.template.metadata.glueTabWidth).toBeGreaterThan(0)
    expect(result.template.metadata.profile).toBe('straight-cylinder')
  })

  it('keeps generation deterministic for identical inputs', () => {
    const first = generateCylinderTemplate(
      {
        diameterMm: 72,
        heightMm: 96,
      },
      {
        itemId: 'cylinder-2',
        itemName: 'Deterministic Cylinder',
      },
    )

    const second = generateCylinderTemplate(
      {
        diameterMm: 72,
        heightMm: 96,
      },
      {
        itemId: 'cylinder-2',
        itemName: 'Deterministic Cylinder',
      },
    )

    expect(second.template).toEqual(first.template)
  })
})
