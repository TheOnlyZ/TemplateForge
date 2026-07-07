import { describe, expect, it } from 'vitest'
import {
  clampMarginConfig,
  getDefaultMarginConfig,
  getPaperDefinition,
  getPrintableArea,
} from '../../../src/domain/paper/index.ts'

describe('printable area', () => {
  it('computes the printable area using margins', () => {
    const printableArea = getPrintableArea(
      getPaperDefinition('a4'),
      'portrait',
      getDefaultMarginConfig(),
    )

    expect(printableArea.width).toBe(197.3)
    expect(printableArea.height).toBe(284.3)
  })

  it('clamps custom margins to the supported range', () => {
    expect(
      clampMarginConfig({ top: 1, right: 30, bottom: 6.35, left: 3 }),
    ).toEqual({
      top: 3,
      right: 25.4,
      bottom: 6.35,
      left: 3,
    })
  })
})
