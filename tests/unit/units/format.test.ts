import { describe, expect, it } from 'vitest'
import { formatLength, roundForDisplay } from '../../../src/domain/units/index.ts'

describe('unit display formatting', () => {
  it('formats metric lengths in millimeters', () => {
    expect(roundForDisplay(12.3456, 'metric')).toBe(12.35)
    expect(formatLength(152.4, 'metric')).toBe('152.4 mm')
  })

  it('formats imperial lengths in inches', () => {
    expect(roundForDisplay(25.4, 'imperial')).toBe(1)
    expect(formatLength(152.4, 'imperial')).toBe('6 in')
  })
})
