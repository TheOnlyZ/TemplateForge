import { describe, expect, it } from 'vitest'
import { generateBoxTemplate } from '../../../../src/domain/shapes/box/index.ts'

describe('generateBoxTemplate', () => {
  it('builds an open tray template with the expected structure', () => {
    const result = generateBoxTemplate(
      {
        externalLengthMm: 180,
        externalWidthMm: 120,
        externalHeightMm: 45,
        glueTabWidthMm: 16,
        style: 'open-tray',
      },
      {
        itemId: 'box-1',
        itemName: 'Sample Tray',
      },
    )

    expect(result.template.parts).toHaveLength(1)
    expect(result.template.panels).toHaveLength(5)
    expect(result.template.tabs).toHaveLength(4)
    expect(result.template.foldLines).toHaveLength(8)
    expect(result.template.metadata.style).toBe('open-tray')
  })

  it('builds a glue tab carton with four main panels and a side seam', () => {
    const result = generateBoxTemplate(
      {
        externalLengthMm: 140,
        externalWidthMm: 90,
        externalHeightMm: 55,
        glueTabWidthMm: 16,
        style: 'glue-tab-carton',
      },
      {
        itemId: 'carton-1',
        itemName: 'Glue Carton',
      },
    )

    expect(result.template.panels).toHaveLength(4)
    expect(result.template.tabs.some((tab) => tab.label === 'Glue Seam')).toBe(true)
    expect(result.template.tabs).toHaveLength(9)
  })

  it('builds a tuck carton with tuck flap labels in the tab set', () => {
    const result = generateBoxTemplate(
      {
        externalLengthMm: 140,
        externalWidthMm: 90,
        externalHeightMm: 55,
        glueTabWidthMm: 16,
        style: 'tuck-carton',
      },
      {
        itemId: 'carton-2',
        itemName: 'Tuck Carton',
      },
    )

    expect(result.template.panels).toHaveLength(4)
    expect(result.template.tabs.some((tab) => tab.label === 'Top Tuck Flap')).toBe(true)
    expect(result.template.tabs.some((tab) => tab.label === 'Bottom Tuck Flap')).toBe(true)
  })

  it('keeps generation deterministic for identical inputs', () => {
    const first = generateBoxTemplate(
      {
        externalLengthMm: 160,
        externalWidthMm: 90,
        externalHeightMm: 40,
        glueTabWidthMm: 12,
        style: 'open-tray',
      },
      {
        itemId: 'box-2',
        itemName: 'Deterministic Tray',
      },
    )

    const second = generateBoxTemplate(
      {
        externalLengthMm: 160,
        externalWidthMm: 90,
        externalHeightMm: 40,
        glueTabWidthMm: 12,
        style: 'open-tray',
      },
      {
        itemId: 'box-2',
        itemName: 'Deterministic Tray',
      },
    )

    expect(second.template).toEqual(first.template)
  })
})
