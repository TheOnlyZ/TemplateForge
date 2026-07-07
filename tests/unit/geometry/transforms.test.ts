import { describe, expect, it } from 'vitest'
import { applyTransform, rotate, translate } from '../../../src/domain/geometry/index.ts'

describe('geometry transforms', () => {
  it('translates a point', () => {
    expect(translate({ x: 10, y: 5 }, { x: -2, y: 8 })).toEqual({ x: 8, y: 13 })
  })

  it('rotates a point around the origin', () => {
    expect(rotate({ x: 10, y: 0 }, 90)).toEqual({ x: 0, y: 10 })
  })

  it('applies combined transforms to a path', () => {
    expect(
      applyTransform(
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        { rotateDegrees: 90, translate: { x: 2, y: 0 } },
      ),
    ).toEqual([
      { x: 2, y: 0 },
      { x: 2, y: 1 },
    ])
  })
})
