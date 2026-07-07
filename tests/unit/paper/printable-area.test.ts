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

  it('computes the legal printable area in landscape orientation', () => {
    const printableArea = getPrintableArea(
      getPaperDefinition('legal'),
      'landscape',
      getDefaultMarginConfig(),
    )

    expect(printableArea.width).toBe(342.9)
    expect(printableArea.height).toBe(203.2)
  })

  it('shrinks the printable area when large margins consume more of the sheet', () => {
    const printableArea = getPrintableArea(getPaperDefinition('letter'), 'portrait', {
      top: 25.4,
      right: 25.4,
      bottom: 25.4,
      left: 25.4,
    })

    expect(printableArea.width).toBe(165.1)
    expect(printableArea.height).toBe(228.6)
  })
})
