import { describe, expect, it } from 'vitest'
import { generateCustomParametricShapeTemplate } from '../../../../src/domain/shapes/custom-parametric/index.ts'

describe('generateCustomParametricShapeTemplate', () => {
  it('builds a custom strip from user-defined panel widths and labels', () => {
    const result = generateCustomParametricShapeTemplate(
      {
        partName: 'Custom Wrap',
        panelHeightMm: 72,
        glueTabWidthMm: 14,
        topTabDepthMm: 18,
        bottomTabDepthMm: 16,
        panels: [
          { name: 'Front Panel', widthMm: 68 },
          { name: 'Right Gusset', widthMm: 24 },
          { name: 'Back Panel', widthMm: 68 },
          { name: 'Left Gusset', widthMm: 24 },
        ],
      },
      {
        itemId: 'custom-shape-1',
        itemName: 'Custom Shape 1',
      },
    )

    expect(result.template.shapeType).toBe('custom-parametric')
    expect(result.template.parts).toHaveLength(1)
    expect(result.template.panels.map((panel) => panel.name)).toEqual([
      'Front Panel',
      'Right Gusset',
      'Back Panel',
      'Left Gusset',
    ])
    expect(result.template.tabs.some((tab) => tab.label === 'Glue Seam')).toBe(true)
    expect(result.template.foldLines.length).toBeGreaterThan(4)
    expect(result.template.metadata.profile).toBe('custom-parametric')
  })

  it('supports custom strips without optional top and bottom tabs', () => {
    const result = generateCustomParametricShapeTemplate(
      {
        partName: 'Flat Sleeve',
        panelHeightMm: 58,
        glueTabWidthMm: 12,
        panels: [
          { name: 'Panel A', widthMm: 50 },
          { name: 'Panel B', widthMm: 36 },
          { name: 'Panel C', widthMm: 50 },
        ],
      },
      {
        itemId: 'custom-shape-2',
        itemName: 'Custom Shape 2',
      },
    )

    expect(result.template.tabs).toHaveLength(1)
    expect(result.template.panels).toHaveLength(3)
    expect(result.template.foldLines).toHaveLength(3)
  })

  it('keeps generation deterministic for identical custom shape inputs', () => {
    const first = generateCustomParametricShapeTemplate(
      {
        partName: 'Deterministic Custom',
        panelHeightMm: 64,
        glueTabWidthMm: 12,
        topTabDepthMm: 14,
        panels: [
          { name: 'Panel 1', widthMm: 48 },
          { name: 'Panel 2', widthMm: 32 },
          { name: 'Panel 3', widthMm: 48 },
        ],
      },
      {
        itemId: 'custom-shape-3',
        itemName: 'Custom Shape 3',
      },
    )
    const second = generateCustomParametricShapeTemplate(
      {
        partName: 'Deterministic Custom',
        panelHeightMm: 64,
        glueTabWidthMm: 12,
        topTabDepthMm: 14,
        panels: [
          { name: 'Panel 1', widthMm: 48 },
          { name: 'Panel 2', widthMm: 32 },
          { name: 'Panel 3', widthMm: 48 },
        ],
      },
      {
        itemId: 'custom-shape-3',
        itemName: 'Custom Shape 3',
      },
    )

    expect(second.template).toEqual(first.template)
  })
})
