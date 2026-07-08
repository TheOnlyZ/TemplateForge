import { describe, expect, it } from 'vitest'
import { generateBoxTemplate } from '../../../../src/domain/shapes/box/index.ts'
import { buildBoxAssemblyModel } from '../../../../src/features/assembly/model.ts'

describe('buildBoxAssemblyModel', () => {
  it('builds normalized face mappings and instruction steps for open trays', () => {
    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 120,
        externalWidthMm: 80,
        externalHeightMm: 24,
        glueTabWidthMm: 12,
        style: 'open-tray',
      },
      {
        itemId: 'assembly-model-tray',
        itemName: 'Assembly Model Tray',
      },
    )
    const model = buildBoxAssemblyModel(template, 'open-tray')

    expect(model.defaultMode).toBe('finished')
    expect(model.faces.map((face) => face.label)).toEqual(['Front', 'Back', 'Left', 'Right', 'Base'])
    expect(model.steps.map((step) => step.title)).toEqual([
      'Step 1',
      'Step 2',
      'Step 3',
      'Step 4',
      'Step 5',
      'Step 6',
    ])
    expect(model.steps[0]!.cueLabel).toBe('Fold Up')
    expect(model.steps[4]!.cueLabel).toBe('Glue Here')
    expect(model.steps[4]!.glueTabIds.length).toBe(4)
  })

  it('maps carton top and base faces to closure tabs', () => {
    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 140,
        externalWidthMm: 90,
        externalHeightMm: 55,
        glueTabWidthMm: 16,
        style: 'tuck-carton',
      },
      {
        itemId: 'assembly-model-carton',
        itemName: 'Assembly Model Carton',
      },
    )
    const model = buildBoxAssemblyModel(template, 'tuck-carton')
    const topFace = model.faces.find((face) => face.id === 'top')!
    const baseFace = model.faces.find((face) => face.id === 'base')!

    expect(topFace.targetIds.length).toBeGreaterThan(0)
    expect(baseFace.targetIds.length).toBeGreaterThan(0)
    expect(model.steps[4]!.focusFaceId).toBe('top')
    expect(model.steps[5]!.focusFaceId).toBe('base')
  })
})
