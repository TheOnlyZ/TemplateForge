import { describe, expect, it } from 'vitest'
import { buildStripNet, buildCrossNet, buildTNetCarton } from '../../../../src/domain/shapes/box/net-geometry.ts'
import { layoutTemplate, stripNetTemplate, crossNetTemplate, tLayoutNetTemplate } from '../../../../src/domain/shapes/box/net-templates.ts'
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

const TOL = 0.01

interface FaceSummary {
  id: string
  name: string
  w: number
  h: number
}

type FoldSummary = {
  id: string
  faceAId: string
  faceBId: string
  angle: number
  direction: string
}

function summarizeFaces(faces: { id: string; name: string; widthMm: number; heightMm: number }[]): FaceSummary[] {
  return faces.map((f) => ({ id: f.id, name: f.name, w: f.widthMm, h: f.heightMm })).sort((a, b) => a.id.localeCompare(b.id))
}

function summarizeFolds(folds: { id: string; faceAId: string; faceBId: string; angle: number; direction: string }[]): FoldSummary[] {
  return folds.map((f) => ({ id: f.id, faceAId: f.faceAId, faceBId: f.faceBId, angle: f.angle, direction: f.direction })).sort((a, b) => a.id.localeCompare(b.id))
}

function runComparison(label: string, template: typeof stripNetTemplate, oldFn: typeof buildStripNet) {
  describe(label, () => {
    const old = oldFn(input)
    const tpl = layoutTemplate(template, input)

    it('produces 6 faces', () => {
      expect(tpl.faces).toHaveLength(6)
      expect(old.faces).toHaveLength(6)
    })

    it('face dimensions match', () => {
      const oldSum = summarizeFaces(old.faces)
      const tplSum = summarizeFaces(tpl.faces)
      expect(tplSum).toEqual(oldSum)
    })

    it('fold count matches (structural folds only)', () => {
      expect(tpl.folds).toHaveLength(5)
      const oldStructural = old.folds.filter((f) => !f.id.includes('glue-seam'))
      expect(oldStructural).toHaveLength(5)
    })

    it('structural fold connections match', () => {
      const oldStructural = old.folds.filter((f) => !f.id.includes('glue-seam'))
      const oldSum = summarizeFolds(oldStructural)
      const tplSum = summarizeFolds(tpl.folds)
      expect(tplSum).toEqual(oldSum)
    })

    it('each face polygon has matching dimensions', () => {
      for (const f of tpl.faces) {
        const { width, height } = getBounds(f.polygon)
        expect(Math.abs(width - f.widthMm)).toBeLessThan(TOL)
        expect(Math.abs(height - f.heightMm)).toBeLessThan(TOL)
      }
    })
  })
}

function getBounds(points: { x: number; y: number }[]): { width: number; height: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  return { width: maxX - minX, height: maxY - minY }
}

runComparison('strip template', stripNetTemplate, buildStripNet)
runComparison('cross template', crossNetTemplate, buildCrossNet)
runComparison('t-layout template', tLayoutNetTemplate, buildTNetCarton)
