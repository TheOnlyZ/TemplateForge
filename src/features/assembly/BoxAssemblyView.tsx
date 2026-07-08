import { type PointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import type { AssemblyPartMapping } from './mapping.ts'
import type {
  AssemblyFaceId,
  AssemblyMode,
  AssemblySequenceStepId,
  BoxAssemblyModel,
  BoxAssemblyStep,
} from './model.ts'
import type { BoxInput, BoxStyle } from '../../domain/shapes/box/index.ts'
import { formatLength, type UnitSystem } from '../../domain/units/index.ts'

interface Point2D {
  x: number
  y: number
}

interface Point3D {
  x: number
  y: number
  z: number
}

interface FaceGeometry {
  id: AssemblyFaceId
  label: string
  points: Point3D[]
  normal: Point3D
}

interface OpenTopGeometry {
  outer: Point3D[]
  inner: Point3D[]
}

interface BoxGeometry {
  faces: FaceGeometry[]
  openTop?: OpenTopGeometry
}

interface RenderedFace {
  id: AssemblyFaceId
  label: string
  path: string
  labelPoint: Point2D
  averageDepth: number
  facingViewer: boolean
}

interface BoxAssemblyViewProps {
  name: string
  boxInput: BoxInput
  model: BoxAssemblyModel
  partMappings: AssemblyPartMapping[]
  unitSystem: UnitSystem
  mode: AssemblyMode
  activeFaceId?: AssemblyFaceId | null
  selectedFaceId?: AssemblyFaceId | null
  activeStepId?: AssemblySequenceStepId | null
  onFaceHoverChange?: (faceId: AssemblyFaceId | null) => void
  onFaceSelect?: (faceId: AssemblyFaceId | null) => void
  onModeChange?: (mode: AssemblyMode) => void
  onStepChange?: (stepId: AssemblySequenceStepId) => void
}

const VIEWPORT_WIDTH = 420
const VIEWPORT_HEIGHT = 320
const SEQUENCE_ADVANCE_MS = 1800

function rotatePoint(point: Point3D, yawRad: number, pitchRad: number): Point3D {
  const cosYaw = Math.cos(yawRad)
  const sinYaw = Math.sin(yawRad)
  const yawX = point.x * cosYaw - point.y * sinYaw
  const yawY = point.x * sinYaw + point.y * cosYaw
  const cosPitch = Math.cos(pitchRad)
  const sinPitch = Math.sin(pitchRad)

  return {
    x: yawX,
    y: yawY * cosPitch - point.z * sinPitch,
    z: yawY * sinPitch + point.z * cosPitch,
  }
}

function projectPoint(point: Point3D, cameraDistance: number): Point2D {
  const perspective = cameraDistance / (cameraDistance + point.y)

  return {
    x: point.x * perspective,
    y: -point.z * perspective,
  }
}

function polygonToPath(points: Point2D[]) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ') + ' Z'
}

function getPolygonCenter(points: Point2D[]) {
  return {
    x: points.reduce((total, point) => total + point.x, 0) / points.length,
    y: points.reduce((total, point) => total + point.y, 0) / points.length,
  }
}

function translatePoints(points: Point2D[]) {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  const width = maxX - minX || 1
  const height = maxY - minY || 1
  const fitScale = Math.min((VIEWPORT_WIDTH * 0.68) / width, (VIEWPORT_HEIGHT * 0.68) / height)
  const offsetX = VIEWPORT_WIDTH / 2 - ((minX + maxX) / 2) * fitScale
  const offsetY = VIEWPORT_HEIGHT / 2 - ((minY + maxY) / 2) * fitScale

  return points.map((point) => ({
    x: point.x * fitScale + offsetX,
    y: point.y * fitScale + offsetY,
  }))
}

function getStyleLabel(style: BoxStyle) {
  if (style === 'open-tray') {
    return 'Open Tray'
  }

  if (style === 'glue-tab-carton') {
    return 'Glue Tab Carton'
  }

  return 'Tuck Carton'
}

function getCueText(step: BoxAssemblyStep) {
  if (step.cueKind === 'fold-up') {
    return 'Fold Up'
  }

  if (step.cueKind === 'fold-in') {
    return 'Fold In'
  }

  if (step.cueKind === 'fold-over') {
    return 'Fold Over'
  }

  if (step.cueKind === 'glue-here') {
    return 'Glue Here'
  }

  return 'Press Secure'
}

function getFaceDepthOrder(model: BoxAssemblyModel) {
  return model.faces.reduce<Record<AssemblyFaceId, number>>(
    (result, face, index) => ({
      ...result,
      [face.id]: index,
    }),
    {} as Record<AssemblyFaceId, number>,
  )
}

function buildBoxGeometry(style: BoxStyle, length: number, width: number, height: number): BoxGeometry {
  const halfLength = length / 2
  const halfWidth = width / 2
  const halfHeight = height / 2
  const points = {
    frontLeftBottom: { x: -halfLength, y: -halfWidth, z: -halfHeight },
    frontRightBottom: { x: halfLength, y: -halfWidth, z: -halfHeight },
    backRightBottom: { x: halfLength, y: halfWidth, z: -halfHeight },
    backLeftBottom: { x: -halfLength, y: halfWidth, z: -halfHeight },
    frontLeftTop: { x: -halfLength, y: -halfWidth, z: halfHeight },
    frontRightTop: { x: halfLength, y: -halfWidth, z: halfHeight },
    backRightTop: { x: halfLength, y: halfWidth, z: halfHeight },
    backLeftTop: { x: -halfLength, y: halfWidth, z: halfHeight },
  }
  const faces: FaceGeometry[] = [
    {
      id: 'front',
      label: 'Front',
      normal: { x: 0, y: -1, z: 0 },
      points: [points.frontLeftBottom, points.frontRightBottom, points.frontRightTop, points.frontLeftTop],
    },
    {
      id: 'back',
      label: 'Back',
      normal: { x: 0, y: 1, z: 0 },
      points: [points.backRightBottom, points.backLeftBottom, points.backLeftTop, points.backRightTop],
    },
    {
      id: 'left',
      label: 'Left',
      normal: { x: -1, y: 0, z: 0 },
      points: [points.backLeftBottom, points.frontLeftBottom, points.frontLeftTop, points.backLeftTop],
    },
    {
      id: 'right',
      label: 'Right',
      normal: { x: 1, y: 0, z: 0 },
      points: [points.frontRightBottom, points.backRightBottom, points.backRightTop, points.frontRightTop],
    },
    {
      id: 'base',
      label: 'Base',
      normal: { x: 0, y: 0, z: -1 },
      points: [points.frontLeftBottom, points.frontRightBottom, points.backRightBottom, points.backLeftBottom],
    },
  ]

  if (style !== 'open-tray') {
    faces.push({
      id: 'top',
      label: 'Top',
      normal: { x: 0, y: 0, z: 1 },
      points: [points.frontLeftTop, points.frontRightTop, points.backRightTop, points.backLeftTop],
    })

    return { faces }
  }

  const lipInset = Math.min(length, width) * 0.16
  const lipDepth = Math.min(height * 0.26, Math.min(length, width) * 0.18)
  const openTop: OpenTopGeometry = {
    outer: [points.frontLeftTop, points.frontRightTop, points.backRightTop, points.backLeftTop],
    inner: [
      { x: -halfLength + lipInset, y: -halfWidth + lipInset, z: halfHeight - lipDepth },
      { x: halfLength - lipInset, y: -halfWidth + lipInset, z: halfHeight - lipDepth },
      { x: halfLength - lipInset, y: halfWidth - lipInset, z: halfHeight - lipDepth },
      { x: -halfLength + lipInset, y: halfWidth - lipInset, z: halfHeight - lipDepth },
    ],
  }

  return { faces, openTop }
}

function buildExplodedOffsets(mode: AssemblyMode, model: BoxAssemblyModel, activeStepId: AssemblySequenceStepId | null) {
  const faceSequenceIndex = new Map<AssemblyFaceId, number>()

  for (const [index, step] of model.steps.entries()) {
    if (step.focusFaceId !== null && !faceSequenceIndex.has(step.focusFaceId)) {
      faceSequenceIndex.set(step.focusFaceId, index)
    }
  }

  const activeStepIndex =
    activeStepId === null ? 0 : Math.max(0, model.steps.findIndex((step) => step.id === activeStepId))

  return model.faces.reduce<Record<AssemblyFaceId, number>>((result, face) => {
    if (mode === 'finished') {
      result[face.id] = 0
      return result
    }

    if (mode === 'exploded') {
      result[face.id] = 1
      return result
    }

    const sequenceIndex = faceSequenceIndex.get(face.id)
    result[face.id] = sequenceIndex === undefined || sequenceIndex <= activeStepIndex ? 0 : 1
    return result
  }, {} as Record<AssemblyFaceId, number>)
}

function buildFaceOffset(faceId: AssemblyFaceId, amount: number): Point3D {
  if (faceId === 'front') {
    return { x: 0, y: -amount, z: 0 }
  }

  if (faceId === 'back') {
    return { x: 0, y: amount, z: 0 }
  }

  if (faceId === 'left') {
    return { x: -amount, y: 0, z: 0 }
  }

  if (faceId === 'right') {
    return { x: amount, y: 0, z: 0 }
  }

  if (faceId === 'top') {
    return { x: 0, y: 0, z: amount }
  }

  return { x: 0, y: 0, z: -amount * 0.66 }
}

function transformFace(
  face: FaceGeometry,
  explodedFactor: number,
  yaw: number,
  pitch: number,
  cameraDistance: number,
  explosionDistance: number,
) {
  const offset = buildFaceOffset(face.id, explosionDistance * explodedFactor)
  const transformedPoints3D = face.points.map((point) =>
    rotatePoint(
      {
        x: point.x + offset.x,
        y: point.y + offset.y,
        z: point.z + offset.z,
      },
      yaw,
      pitch,
    ),
  )
  const projectedPoints = transformedPoints3D.map((point) => projectPoint(point, cameraDistance))
  const transformedNormal = rotatePoint(face.normal, yaw, pitch)

  return {
    averageDepth: transformedPoints3D.reduce((total, point) => total + point.y, 0) / transformedPoints3D.length,
    facingViewer: transformedNormal.y < 0,
    points: projectedPoints,
  }
}

export function BoxAssemblyView({
  activeFaceId = null,
  activeStepId = null,
  boxInput,
  mode,
  model,
  name,
  onFaceHoverChange,
  onFaceSelect,
  onModeChange,
  onStepChange,
  partMappings,
  selectedFaceId = null,
  unitSystem,
}: BoxAssemblyViewProps) {
  const [isTransparent, setIsTransparent] = useState(false)
  const [isPlayingSequence, setIsPlayingSequence] = useState(false)
  const [yaw, setYaw] = useState(0.78)
  const [pitch, setPitch] = useState(-0.5)
  const dragStateRef = useRef<{ pointerId: number; x: number; y: number } | null>(null)
  const activeStep = useMemo(
    () => model.steps.find((step) => step.id === activeStepId) ?? model.steps[0] ?? null,
    [activeStepId, model.steps],
  )

  useEffect(() => {
    if (mode !== 'sequence') {
      setIsPlayingSequence(false)
      return
    }

    if (activeStep === null) {
      onStepChange?.(model.steps[0]!.id)
    }
  }, [activeStep, mode, model.steps, onStepChange])

  useEffect(() => {
    if (mode !== 'sequence' || !isPlayingSequence || model.steps.length < 2 || activeStep === null) {
      return
    }

    const intervalId = window.setInterval(() => {
      const currentIndex = model.steps.findIndex((step) => step.id === activeStep.id)
      const nextStep = model.steps[(currentIndex + 1) % model.steps.length]!
      onStepChange?.(nextStep.id)
    }, SEQUENCE_ADVANCE_MS)

    return () => window.clearInterval(intervalId)
  }, [activeStep, isPlayingSequence, mode, model.steps, onStepChange])

  const geometry = useMemo(
    () => buildBoxGeometry(boxInput.style, boxInput.externalLengthMm, boxInput.externalWidthMm, boxInput.externalHeightMm),
    [boxInput.externalHeightMm, boxInput.externalLengthMm, boxInput.externalWidthMm, boxInput.style],
  )
  const effectiveActiveFaceId = activeFaceId ?? (mode === 'sequence' ? activeStep?.focusFaceId ?? null : null)
  const explodedFactors = buildExplodedOffsets(mode, model, activeStep?.id ?? null)
  const cameraDistance = Math.max(boxInput.externalLengthMm, boxInput.externalWidthMm, boxInput.externalHeightMm) * 4.6
  const explosionDistance = Math.max(
    12,
    Math.min(boxInput.externalLengthMm, boxInput.externalWidthMm, boxInput.externalHeightMm) * 0.34,
  )
  const transformedFaces = geometry.faces.map((face) => ({
    face,
    ...transformFace(face, explodedFactors[face.id] ?? 0, yaw, pitch, cameraDistance, explosionDistance),
  }))
  const translatedPoints = translatePoints(transformedFaces.flatMap((item) => item.points))
  let pointCursor = 0
  const renderedFaces: RenderedFace[] = transformedFaces.map((item) => {
    const points = translatedPoints.slice(pointCursor, pointCursor + item.points.length)
    pointCursor += item.points.length

    return {
      id: item.face.id,
      label: item.face.label,
      path: polygonToPath(points),
      labelPoint: getPolygonCenter(points),
      averageDepth: item.averageDepth,
      facingViewer: item.facingViewer,
    }
  })
  const renderedOpening =
    geometry.openTop === undefined
      ? undefined
      : (() => {
          const outer = geometry.openTop.outer.map((point) => projectPoint(rotatePoint(point, yaw, pitch), cameraDistance))
          const inner = geometry.openTop.inner.map((point) => projectPoint(rotatePoint(point, yaw, pitch), cameraDistance))
          const translated = translatePoints([...outer, ...inner])

          return {
            outer: translated.slice(0, outer.length),
            inner: translated.slice(outer.length),
          }
        })()
  const depthOrder = getFaceDepthOrder(model)
  const sortedFaces = [...renderedFaces].sort((first, second) => {
    if (first.averageDepth !== second.averageDepth) {
      return second.averageDepth - first.averageDepth
    }

    return (depthOrder[first.id] ?? 0) - (depthOrder[second.id] ?? 0)
  })

  function getFaceClass(faceId: AssemblyFaceId) {
    const baseClass = `assembly-view__face assembly-view__face--${faceId}`

    return `${baseClass}${effectiveActiveFaceId === faceId ? ' is-highlighted' : ''}${isTransparent ? ' is-transparent' : ''}`
  }

  function getLabelClass(faceId: AssemblyFaceId) {
    return `assembly-view__face-label${effectiveActiveFaceId === faceId ? ' is-highlighted' : ''}`
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    dragStateRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - dragState.x
    const deltaY = event.clientY - dragState.y

    dragStateRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }

    setYaw((currentYaw) => currentYaw + deltaX * 0.01)
    setPitch((currentPitch) => Math.max(-0.95, Math.min(-0.1, currentPitch + deltaY * 0.008)))
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null
    }
  }

  function handleModeChange(nextMode: AssemblyMode) {
    onModeChange?.(nextMode)
    if (nextMode === 'sequence') {
      setIsPlayingSequence(true)
      if (activeStep === null && model.steps[0]) {
        onStepChange?.(model.steps[0]!.id)
      }
    } else {
      setIsPlayingSequence(false)
    }
  }

  function handleStepSelect(stepId: AssemblySequenceStepId) {
    onStepChange?.(stepId)
    setIsPlayingSequence(false)
  }

  const cueStep = mode === 'sequence' ? activeStep : null
  const cueFaceId = cueStep?.focusFaceId ?? (boxInput.style === 'open-tray' ? 'front' : 'right')
  const cueFace = renderedFaces.find((face) => face.id === cueFaceId)
  const cueAnchor =
    cueFace === undefined
      ? null
      : {
          x: cueFace.labelPoint.x,
          y: cueFace.labelPoint.y,
        }

  return (
    <div className="assembly-view">
      <div className="assembly-view__mode-bar">
        <div className="toolbar-group" aria-label="Assembly modes">
          <button
            type="button"
            className="toolbar-button"
            aria-pressed={mode === 'finished'}
            onClick={() => handleModeChange('finished')}
          >
            Finished Object
          </button>
          <button
            type="button"
            className="toolbar-button"
            aria-pressed={mode === 'exploded'}
            onClick={() => handleModeChange('exploded')}
          >
            Exploded View
          </button>
          <button
            type="button"
            className="toolbar-button"
            aria-pressed={mode === 'sequence'}
            onClick={() => handleModeChange('sequence')}
          >
            Assembly Sequence
          </button>
        </div>
        <button
          type="button"
          className="toolbar-button toolbar-button--ghost"
          onClick={() => setIsTransparent((currentValue) => !currentValue)}
        >
          {isTransparent ? 'Opaque Faces' : 'Show Through'}
        </button>
      </div>

      <svg
        className="assembly-view__scene"
        viewBox={`0 0 ${VIEWPORT_WIDTH} ${VIEWPORT_HEIGHT}`}
        role="img"
        aria-label={`${name} assembled 3D view`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <ellipse className="assembly-view__shadow" cx="210" cy="276" rx="112" ry="24" />
        {sortedFaces.map((face) => (
          <g
            key={face.id}
            data-face-id={face.id}
            className="assembly-view__face-layer"
            role="button"
            tabIndex={0}
            onMouseEnter={() => onFaceHoverChange?.(face.id)}
            onMouseLeave={() => onFaceHoverChange?.(null)}
            onFocus={() => onFaceHoverChange?.(face.id)}
            onBlur={() => onFaceHoverChange?.(null)}
            onClick={() => onFaceSelect?.(selectedFaceId === face.id ? null : face.id)}
          >
            <path d={face.path} className={getFaceClass(face.id)} />
            {(mode === 'finished' || mode === 'exploded' || face.facingViewer || effectiveActiveFaceId === face.id) && (
              <text x={face.labelPoint.x} y={face.labelPoint.y} className={getLabelClass(face.id)}>
                {face.label}
              </text>
            )}
          </g>
        ))}
        {renderedOpening && (
          <g className="assembly-view__opening-layer">
            <path d={polygonToPath(renderedOpening.outer)} className="assembly-view__opening-rim" />
            <path d={polygonToPath(renderedOpening.inner)} className="assembly-view__opening" />
          </g>
        )}
        {cueStep && cueAnchor && (
          <g className="assembly-view__cue" aria-label="Fold direction cue">
            <path
              d={`M ${cueAnchor.x - 54} ${cueAnchor.y - 40} L ${cueAnchor.x - 8} ${cueAnchor.y - 8}`}
              className="assembly-view__cue-line"
            />
            <path
              d={`M ${cueAnchor.x - 12} ${cueAnchor.y - 12} L ${cueAnchor.x - 4} ${cueAnchor.y - 10} L ${cueAnchor.x - 8} ${cueAnchor.y - 4} Z`}
              className="assembly-view__cue-arrow"
            />
            <g className="assembly-view__cue-badge">
              <rect x={cueAnchor.x - 92} y={cueAnchor.y - 60} width="82" height="22" rx="11" />
              <text x={cueAnchor.x - 51} y={cueAnchor.y - 46}>
                {getCueText(cueStep)}
              </text>
            </g>
          </g>
        )}
      </svg>

      <div className="assembly-view__summary-card">
        {mode === 'finished' && (
          <>
            <strong>This is the finished object.</strong>
            <p>
              Rotate the box to orient yourself, then switch to Exploded View or Assembly Sequence
              to understand how the flat template becomes the final form.
            </p>
          </>
        )}
        {mode === 'exploded' && (
          <>
            <strong>This is how the box is organized.</strong>
            <p>
              Each face stays aligned with the finished object while separating outward just enough
              to clarify its relationship to the assembled form.
            </p>
          </>
        )}
        {mode === 'sequence' && cueStep && (
          <>
            <strong>{cueStep.title}</strong>
            <p>{cueStep.instruction}</p>
          </>
        )}
      </div>

      {mode === 'sequence' && activeStep && (
        <div className="assembly-view__sequence-header">
          <div>
            <strong>{activeStep.title}</strong>
            <p>{activeStep.instruction}</p>
          </div>
          <div className="toolbar-group assembly-view__controls">
            <span className="tag">
              Step {model.steps.findIndex((step) => step.id === activeStep.id) + 1} of {model.steps.length}
            </span>
            <button
              type="button"
              className="toolbar-button"
              onClick={() => setIsPlayingSequence((currentValue) => !currentValue)}
            >
              {isPlayingSequence ? 'Pause Sequence' : 'Play Sequence'}
            </button>
          </div>
        </div>
      )}

      {mode === 'sequence' && (
        <div className="assembly-view__steps" aria-label="Assembly sequence steps">
          {model.steps.map((step, index) => {
            const isCompleted = activeStep !== null && model.steps.findIndex((candidate) => candidate.id === activeStep.id) > index

            return (
              <button
                key={step.id}
                type="button"
                className={`assembly-view__step${activeStep?.id === step.id ? ' active' : ''}`}
                onClick={() => handleStepSelect(step.id)}
              >
                <span>{isCompleted ? '✓' : index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <small>{step.instruction}</small>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="assembly-view__mapping" aria-label="Part identification and page mapping">
        <div className="assembly-view__mapping-header">
          <strong>Part Identification</strong>
          <span className="tag">
            {partMappings.length} part{partMappings.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="assembly-view__mapping-list">
          {partMappings.map((mapping) => (
            <article key={mapping.partId} className="assembly-view__mapping-item">
              <div>
                <strong>{mapping.partName}</strong>
                <p>
                  {mapping.tileCount === 1
                    ? 'This assembled part maps to a single printable page.'
                    : `This assembled part spans ${mapping.tileCount} printable tiles.`}
                </p>
              </div>
              <div className="assembly-view__mapping-pages">
                {mapping.pageLabels.map((label) => (
                  <span key={label} className="meta-chip">
                    {label}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="assembly-view__meta" aria-label="Assembly dimensions">
        <span className="meta-chip">{formatLength(boxInput.externalLengthMm, unitSystem)} L</span>
        <span className="meta-chip">{formatLength(boxInput.externalWidthMm, unitSystem)} W</span>
        <span className="meta-chip">{formatLength(boxInput.externalHeightMm, unitSystem)} H</span>
        <span className="meta-chip">{getStyleLabel(boxInput.style)}</span>
      </div>
    </div>
  )
}
