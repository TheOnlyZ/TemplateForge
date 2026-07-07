import { describe, expect, it } from 'vitest'
import { getBounds } from '../../../src/domain/geometry/index.ts'

describe('getBounds', () => {
  it('returns zero bounds for an empty point set', () => {
    expect(getBounds([])).toEqual({
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    })
  })

  it('returns the full extent of a polygon', () => {
    expect(
      getBounds([
        { x: 10, y: 20 },
        { x: 50, y: 10 },
        { x: 25, y: 60 },
      ]),
    ).toEqual({
      minX: 10,
      minY: 10,
      maxX: 50,
      maxY: 60,
      width: 40,
      height: 50,
    })
  })
})
