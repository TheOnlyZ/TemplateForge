import { describe, expect, it } from 'vitest'
import { withinTolerance } from '../../../src/domain/units/index.ts'

describe('print tolerance helper', () => {
  it('accepts values within the default tolerance', () => {
    expect(withinTolerance(100.4, 100)).toBe(true)
    expect(withinTolerance(100.6, 100)).toBe(false)
  })

  it('accepts an explicit tolerance override', () => {
    expect(withinTolerance(100.6, 100, 1)).toBe(true)
  })
})
