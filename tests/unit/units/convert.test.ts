import { describe, expect, it } from 'vitest'
import { convertInchesToMm, convertMmToInches, MM_PER_INCH } from '../../../src/domain/units/index.ts'

describe('unit conversion helpers', () => {
  it('converts inches to millimeters', () => {
    expect(convertInchesToMm(1)).toBe(MM_PER_INCH)
    expect(convertInchesToMm(6)).toBe(152.4)
  })

  it('converts millimeters to inches', () => {
    expect(convertMmToInches(25.4)).toBe(1)
    expect(convertMmToInches(152.4)).toBe(6)
  })
})
