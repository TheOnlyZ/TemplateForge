import { getBounds, type Bounds, type Point } from '../../geometry/index.ts'
import type { TemplateItem } from '../../templates/index.ts'

export type ShapeType =
  | 'box'
  | 'cylinder'
  | 'cone'
  | 'polygonal-prism'
  | 'tube'
  | 'sleeve'
  | 'drawer-box'
  | 'telescoping-box'
  | 'custom-parametric'

export interface ShapeGenerationContext {
  itemId: string
  itemName: string
}

export interface ShapeGenerationResult {
  template: TemplateItem
}

export function createEntityId(
  context: ShapeGenerationContext,
  entityType: string,
  name: string,
) {
  return `${context.itemId}:${entityType}:${name}`
}

export function createRectangle(x: number, y: number, width: number, height: number): Point[] {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ]
}

export function getOutlineBounds(outlines: Point[][]): Bounds {
  return getBounds(outlines.flat())
}

export function getRectangleCenter(outline: Point[]): Point {
  const bounds = getBounds(outline)

  return {
    x: bounds.minX + bounds.width / 2,
    y: bounds.minY + bounds.height / 2,
  }
}
