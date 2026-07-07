import { describe, expect, it } from 'vitest'
import { buildClosedPath, offsetPath } from '../../../src/domain/geometry/index.ts'

describe('path helpers', () => {
  it('builds a closed polygon path', () => {
    expect(
      buildClosedPath([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ]),
    ).toEqual([
      { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
      { start: { x: 10, y: 0 }, end: { x: 10, y: 10 } },
      { start: { x: 10, y: 10 }, end: { x: 0, y: 0 } },
    ])
  })

  it('offsets every point by the provided vector', () => {
    expect(
      offsetPath(
        [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ],
        { x: 10, y: -5 },
      ),
    ).toEqual([
      { x: 11, y: -4 },
      { x: 12, y: -3 },
    ])
  })
})
