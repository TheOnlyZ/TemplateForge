import { describe, expect, it } from 'vitest'
import { layoutTemplate } from '../../../src/domain/layout/index.ts'
import { getDefaultMarginConfig, getPaperDefinition } from '../../../src/domain/paper/index.ts'
import { generateBoxTemplate } from '../../../src/domain/shapes/box/index.ts'

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

  it('blocks layouts that exceed the printable area', () => {
    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 400,
        externalWidthMm: 260,
        externalHeightMm: 80,
        glueTabWidthMm: 16,
        style: 'glue-tab-carton',
      },
      {
        itemId: 'layout-overflow',
        itemName: 'Layout Overflow',
      },
    )

    const result = layoutTemplate(template, getPaperDefinition('a4'), 'portrait', getDefaultMarginConfig())

    expect(result.hasLegalPlacement).toBe(false)
    expect(result.printableAreaOverflow).toBe(true)
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
  })
})
