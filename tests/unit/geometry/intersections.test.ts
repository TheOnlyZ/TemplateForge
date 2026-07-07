import { describe, expect, it } from 'vitest'
import { intersects } from '../../../src/domain/geometry/index.ts'

describe('intersects', () => {
  it('detects crossing segments', () => {
    expect(
      intersects(
        { start: { x: 0, y: 0 }, end: { x: 10, y: 10 } },
        { start: { x: 0, y: 10 }, end: { x: 10, y: 0 } },
      ),
    ).toBe(true)
  })

  it('rejects disjoint segments', () => {
    expect(
      intersects(
        { start: { x: 0, y: 0 }, end: { x: 4, y: 0 } },
        { start: { x: 6, y: 2 }, end: { x: 8, y: 2 } },
      ),
    ).toBe(false)
  })
})
