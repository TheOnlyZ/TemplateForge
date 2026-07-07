export interface Point {
  x: number
  y: number
}

export interface Vector {
  x: number
  y: number
}

export interface LineSegment {
  start: Point
  end: Point
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export type Polygon = Point[]

export interface Transform2D {
  translate?: Vector
  rotateDegrees?: number
  origin?: Point
}

function normalizeCoordinate(value: number) {
  const rounded = Math.round(value * 1_000_000_000) / 1_000_000_000
  return Math.abs(rounded) < 1e-9 ? 0 : rounded
}

function subtract(a: Point, b: Point): Vector {
  return { x: a.x - b.x, y: a.y - b.y }
}

function crossProduct(a: Vector, b: Vector) {
  return a.x * b.y - a.y * b.x
}

function isPointOnSegment(point: Point, segment: LineSegment) {
  const withinX =
    point.x <= Math.max(segment.start.x, segment.end.x) &&
    point.x >= Math.min(segment.start.x, segment.end.x)
  const withinY =
    point.y <= Math.max(segment.start.y, segment.end.y) &&
    point.y >= Math.min(segment.start.y, segment.end.y)

  return withinX && withinY
}

export function getBounds(points: Point[]): Bounds {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  }

  const firstPoint = points[0]!
  let minX = firstPoint.x
  let maxX = firstPoint.x
  let minY = firstPoint.y
  let maxY = firstPoint.y

  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function translate(point: Point, vector: Vector): Point {
  return {
    x: point.x + vector.x,
    y: point.y + vector.y,
  }
}

export function rotate(point: Point, degrees: number, origin: Point = { x: 0, y: 0 }): Point {
  const radians = (degrees * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const relative = subtract(point, origin)

  return {
    x: normalizeCoordinate(relative.x * cosine - relative.y * sine + origin.x),
    y: normalizeCoordinate(relative.x * sine + relative.y * cosine + origin.y),
  }
}

export function applyTransform(points: Point[], transform: Transform2D): Point[] {
  return points.map((point) => {
    let nextPoint = point

    if (transform.rotateDegrees !== undefined) {
      nextPoint = rotate(nextPoint, transform.rotateDegrees, transform.origin)
    }

    if (transform.translate !== undefined) {
      nextPoint = translate(nextPoint, transform.translate)
    }

    return nextPoint
  })
}

export function offsetPath(points: Point[], offset: Vector): Point[] {
  return points.map((point) => translate(point, offset))
}

export function buildClosedPath(points: Point[]): LineSegment[] {
  if (points.length < 2) {
    return []
  }

  const segments: LineSegment[] = []

  for (let index = 0; index < points.length; index += 1) {
    const nextIndex = (index + 1) % points.length
    const start = points[index]!
    const end = points[nextIndex]!

    segments.push({
      start,
      end,
    })
  }

  return segments
}

export function intersects(first: LineSegment, second: LineSegment) {
  const directionA = subtract(first.end, first.start)
  const directionB = subtract(second.end, second.start)
  const startOffset = subtract(second.start, first.start)

  const denominator = crossProduct(directionA, directionB)
  const offsetCrossA = crossProduct(startOffset, directionA)

  if (denominator === 0 && offsetCrossA === 0) {
    return (
      isPointOnSegment(first.start, second) ||
      isPointOnSegment(first.end, second) ||
      isPointOnSegment(second.start, first) ||
      isPointOnSegment(second.end, first)
    )
  }

  if (denominator === 0) {
    return false
  }

  const t = crossProduct(startOffset, directionB) / denominator
  const u = offsetCrossA / denominator

  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}
