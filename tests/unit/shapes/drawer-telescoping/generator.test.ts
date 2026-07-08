import { describe, expect, it } from 'vitest'
import {
  generateDrawerBoxTemplate,
  generateTelescopingBoxTemplate,
} from '../../../../src/domain/shapes/drawer-telescoping/index.ts'

describe('drawer and telescoping box generators', () => {
  it('builds a drawer box template with an inner drawer and outer sleeve shell', () => {
    const result = generateDrawerBoxTemplate(
      {
        externalLengthMm: 90,
        externalWidthMm: 60,
        externalHeightMm: 18,
        glueTabWidthMm: 12,
      },
      {
        itemId: 'drawer-box-1',
        itemName: 'Drawer Box',
      },
    )

    expect(result.template.shapeType).toBe('drawer-box')
    expect(result.template.parts.map((part) => part.name)).toEqual(['Inner Drawer', 'Sleeve Shell'])
    expect(result.template.tabs.some((tab) => tab.label === 'Glue Seam')).toBe(true)
    expect(result.template.metadata.profile).toBe('drawer-box')
  })

  it('builds a telescoping box template with base tray and lid tray parts', () => {
    const result = generateTelescopingBoxTemplate(
      {
        baseLengthMm: 100,
        baseWidthMm: 70,
        baseHeightMm: 24,
        glueTabWidthMm: 12,
      },
      {
        itemId: 'telescoping-box-1',
        itemName: 'Telescoping Box',
      },
    )

    expect(result.template.shapeType).toBe('telescoping-box')
    expect(result.template.parts.map((part) => part.name)).toEqual(['Base Tray', 'Top Lid'])
    expect(result.template.panels.length).toBe(10)
    expect(result.template.metadata.profile).toBe('telescoping-box')
  })

  it('keeps generation deterministic for identical drawer box inputs', () => {
    const first = generateDrawerBoxTemplate(
      {
        externalLengthMm: 96,
        externalWidthMm: 64,
        externalHeightMm: 20,
        glueTabWidthMm: 12,
      },
      {
        itemId: 'drawer-box-2',
        itemName: 'Deterministic Drawer Box',
      },
    )
    const second = generateDrawerBoxTemplate(
      {
        externalLengthMm: 96,
        externalWidthMm: 64,
        externalHeightMm: 20,
        glueTabWidthMm: 12,
      },
      {
        itemId: 'drawer-box-2',
        itemName: 'Deterministic Drawer Box',
      },
    )

    expect(second.template).toEqual(first.template)
  })
})
