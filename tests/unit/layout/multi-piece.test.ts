import { describe, it, expect } from 'vitest'
import { getNetGenerator } from '../../../src/domain/shapes/box/net-geometry.ts'
import { netToTemplateItem } from '../../../src/domain/shapes/box/net-converter.ts'
import { layoutTemplate } from '../../../src/domain/layout/index.ts'
import { getPaperDefinition } from '../../../src/domain/paper/index.ts'
import { validateNet } from '../../../src/domain/validation/index.ts'
import { validateLayoutResult, mergeValidationResults, validateTemplateInput, validateTemplateGeometry } from '../../../src/domain/validation/index.ts'

describe('multi-piece layout', () => {
  it('splits a 4" x 2.5" x 1.4" glue-tab carton on US Letter', () => {
    // 101.6 × 63.5 × 35.56 mm — this exceeds US Letter printable width as a strip net (~330mm)
    const input = {
      externalLengthMm: 101.6,
      externalWidthMm: 63.5,
      externalHeightMm: 35.56,
      glueTabWidthMm: 10,
      style: 'glue-tab-carton' as const,
    }

    const paper = getPaperDefinition('letter')
    const ctx = { itemId: 'test-multi-piece', itemName: 'Test Box' }
    const margins = { top: 10, right: 10, bottom: 10, left: 10 }

    const net = getNetGenerator('strip')(input)
    const result = netToTemplateItem(net, input, ctx)
    const layout = layoutTemplate(result.template, paper, 'portrait', margins)

    expect(layout.layoutType).toBe('multi-piece')
    expect(layout.hasLegalPlacement).toBe(true)
    expect(layout.assemblyCount).toBe(2)
    expect(layout.pages.length).toBeGreaterThanOrEqual(1)

    // Validate the result is not an error
    const netVal = validateNet(net, input)
    const inputValidation = validateTemplateInput({
      dimensionsMm: {
        length: input.externalLengthMm,
        width: input.externalWidthMm,
        height: input.externalHeightMm,
        glueTabWidth: input.glueTabWidthMm,
      },
    })
    const geometryValidation = validateTemplateGeometry(result.template)
    const shapeValidation = mergeValidationResults(inputValidation, geometryValidation, netVal)
    const layoutValidation = validateLayoutResult({
      pageCount: layout.pageCount,
      printableAreaOverflow: layout.printableAreaOverflow,
      hasLegalPlacement: layout.hasLegalPlacement,
      printableAreaWidthMm: layout.printableArea.width,
      printableAreaHeightMm: layout.printableArea.height,
      margins,
    })
    const validation = mergeValidationResults(shapeValidation, layoutValidation)

    expect(validation.valid).toBe(true)
    expect(layout.pages[0]!.assemblyLabels.length).toBeGreaterThan(0)
    expect(layout.pages[0]!.joinIndicators.length).toBeGreaterThan(0)
  })
})
