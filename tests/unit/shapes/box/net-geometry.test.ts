import { describe, expect, it } from 'vitest'
import { buildStripNet, buildCrossNet, buildTNetCarton } from '../../../../src/domain/shapes/box/net-geometry.ts'
import type { BoxInput } from '../../../../src/domain/shapes/box/index.ts'

const fourInch = 101.6
const twoPointFiveInch = 63.5
const onePointFourInch = 35.56

const input: BoxInput = {
  externalLengthMm: fourInch,
  externalWidthMm: twoPointFiveInch,
  externalHeightMm: onePointFourInch,
  glueTabWidthMm: 12,
  style: 'glue-tab-carton',
}

function runTests(label: string, net: ReturnType<typeof buildStripNet>) {
  describe(label, () => {
    it('produces 6 faces', () => {
      expect(net.faces).toHaveLength(6)
    })

    it('all faces have positive dimensions', () => {
      for (const face of net.faces) {
        expect(face.widthMm).toBeGreaterThan(0)
        expect(face.heightMm).toBeGreaterThan(0)
      }
    })

    it('Front and Back are L × H', () => {
      const front = net.faces.find((f) => f.name === 'Front Panel')!
      const back = net.faces.find((f) => f.name === 'Back Panel')!
      expect(front.widthMm).toBeCloseTo(fourInch)
      expect(front.heightMm).toBeCloseTo(onePointFourInch)
      expect(back.widthMm).toBeCloseTo(fourInch)
      expect(back.heightMm).toBeCloseTo(onePointFourInch)
    })

    it('Left and Right are W × H', () => {
      const left = net.faces.find((f) => f.name === 'Left Panel')!
      const right = net.faces.find((f) => f.name === 'Right Panel')!
      expect(left.widthMm).toBeCloseTo(twoPointFiveInch)
      expect(left.heightMm).toBeCloseTo(onePointFourInch)
      expect(right.widthMm).toBeCloseTo(twoPointFiveInch)
      expect(right.heightMm).toBeCloseTo(onePointFourInch)
    })

    it('Top and Bottom are L × W', () => {
      const top = net.faces.find((f) => f.name === 'Top Panel')!
      const bottom = net.faces.find((f) => f.name === 'Bottom Panel')!
      expect(top.widthMm).toBeCloseTo(fourInch)
      expect(top.heightMm).toBeCloseTo(twoPointFiveInch)
      expect(bottom.widthMm).toBeCloseTo(fourInch)
      expect(bottom.heightMm).toBeCloseTo(twoPointFiveInch)
    })

    it('all face names are unique and follow convention', () => {
      const names = net.faces.map((f) => f.name)
      expect(new Set(names).size).toBe(names.length)

      const validNames = ['Front Panel', 'Back Panel', 'Left Panel', 'Right Panel', 'Top Panel', 'Bottom Panel']
      for (const name of names) {
        expect(validNames).toContain(name)
      }
    })

    it('has exactly one glue tab', () => {
      expect(net.glueTabs).toHaveLength(1)
    })

    it('glue tab attaches to a structural face edge', () => {
      const gt = net.glueTabs[0]!
      const parentFace = net.faces.find((f) => f.id === gt.parentFaceId)
      expect(parentFace).toBeDefined()

      const attachEdge = gt.attachEdge
      const parentPoly = parentFace!.polygon

      const onEdge = parentPoly.some((p, i) => {
        const next = parentPoly[(i + 1) % parentPoly.length]
        return pointOnSegment(attachEdge.start, p, next) && pointOnSegment(attachEdge.end, p, next)
      })
      expect(onEdge).toBe(true)
    })

    it('fold graph connects all 6 faces', () => {
      const faceIds = new Set(net.faces.map((f) => f.id))
      const adj = new Map<string, string[]>()
      for (const face of net.faces) {
        adj.set(face.id, [])
      }
      for (const fold of net.folds) {
        if (!faceIds.has(fold.faceAId) || !faceIds.has(fold.faceBId)) continue
        adj.get(fold.faceAId)!.push(fold.faceBId)
        adj.get(fold.faceBId)!.push(fold.faceAId)
      }

      const visited = new Set<string>()
      const queue = [net.faces[0]!.id]
      while (queue.length > 0) {
        const id = queue.shift()!
        if (visited.has(id)) continue
        visited.add(id)
        for (const n of adj.get(id) ?? []) {
          if (!visited.has(n)) queue.push(n)
        }
      }
      expect(visited.size).toBe(6)
    })

    it('has closure flaps', () => {
      expect(net.flaps.length).toBeGreaterThan(0)
    })
  })
}

function pointOnSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  const cross = Math.abs((p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x))
  if (cross > 0.01) return false
  const dot = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)
  if (dot < 0) return false
  const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2
  return dot <= lenSq
}

runTests('buildStripNet', buildStripNet(input))
runTests('buildCrossNet', buildCrossNet(input))
runTests('buildTNetCarton', buildTNetCarton(input))

describe('net generators with tuck-carton style', () => {
  const tuckInput: BoxInput = { ...input, style: 'tuck-carton' }

  it('buildStripNet produces tuck flaps', () => {
    const net = buildStripNet(tuckInput)
    const tuckFlaps = net.flaps.filter((f) => f.label.includes('Tuck'))
    expect(tuckFlaps.length).toBeGreaterThanOrEqual(1)
  })

  it('buildTNetCarton produces closure flaps', () => {
    const net = buildTNetCarton(tuckInput)
    expect(net.flaps.length).toBeGreaterThan(0)
  })
})
