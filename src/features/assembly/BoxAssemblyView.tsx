import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import type { BoxInput, BoxStyle } from '../../domain/shapes/box/index.ts'
import { formatLength, type UnitSystem } from '../../domain/units/index.ts'

export type AssemblyFaceId = 'front' | 'side' | 'top'
export type AssemblySequenceStepId =
  | 'flat-setup'
  | 'walls-rising'
  | 'tray-ready'
  | 'wrap-body'
  | 'square-shell'
  | 'close-top'

interface AssemblySequenceStep {
  id: AssemblySequenceStepId
  title: string
  description: string
  focusFaceId: AssemblyFaceId
  bodyProgress: number
  topProgress: number
}

interface BoxAssemblyViewProps {
  name: string
  boxInput: BoxInput
  unitSystem: UnitSystem
  activeFaceId?: AssemblyFaceId | null
  onFaceHighlightChange?: (faceId: AssemblyFaceId | null) => void
  onSequenceStepChange?: (stepId: AssemblySequenceStepId, faceId: AssemblyFaceId) => void
}

interface Point2D {
  x: number
  y: number
}

function projectPoint(x: number, y: number, z: number): Point2D {
  return {
    x: (x - y) * 0.92,
    y: (x + y) * 0.48 - z,
  }
}

function translatePoints(points: Point2D[], viewportWidth: number, viewportHeight: number) {
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

  const width = maxX - minX
  const height = maxY - minY
  const offsetX = (viewportWidth - width) / 2 - minX
  const offsetY = (viewportHeight - height) / 2 - minY

  return points.map((point) => ({
    x: point.x + offsetX,
    y: point.y + offsetY,
  }))
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

function getStyleLabel(style: BoxStyle) {
  if (style === 'open-tray') {
    return 'Open Tray'
  }

  if (style === 'glue-tab-carton') {
    return 'Glue Tab Carton'
  }

  return 'Tuck Carton'
}

function getTopFaceLabel(style: BoxStyle) {
  return style === 'open-tray' ? 'Open Top' : 'Top Closure'
}

function getAssemblySequenceSteps(style: BoxStyle): AssemblySequenceStep[] {
  if (style === 'open-tray') {
    return [
      {
        id: 'flat-setup',
        title: 'Flat Setup',
        description: 'Score the front and back wall fold lines first so the tray can hinge upward cleanly from the base.',
        focusFaceId: 'top',
        bodyProgress: 0.22,
        topProgress: 0.3,
      },
      {
        id: 'walls-rising',
        title: 'Walls Rising',
        description: 'Raise the left and right wall folds after the front and back walls are creased to square the tray shell.',
        focusFaceId: 'side',
        bodyProgress: 0.68,
        topProgress: 0.72,
      },
      {
        id: 'tray-ready',
        title: 'Tray Ready',
        description: 'Fold the corner tabs inward last, then secure them behind the front and back walls to lock the tray shape.',
        focusFaceId: 'front',
        bodyProgress: 1,
        topProgress: 1,
      },
    ]
  }

  return [
    {
      id: 'wrap-body',
      title: 'Wrap Body',
      description: 'Pre-crease the main vertical body folds so the carton shell wraps into a square profile without fighting the board grain.',
      focusFaceId: 'side',
      bodyProgress: 0.28,
      topProgress: 0.18,
    },
    {
      id: 'square-shell',
      title: 'Square Shell',
      description: 'Fold the glue seam and bring the side seam together so the carton stands as a squared body.',
      focusFaceId: 'front',
      bodyProgress: 0.84,
      topProgress: 0.44,
    },
    {
      id: 'close-top',
      title: 'Close Top',
      description: 'Pre-crease the closure flaps and dust flaps, then fold the top and bottom closures into place to finish the carton silhouette.',
      focusFaceId: 'top',
      bodyProgress: 1,
      topProgress: 1,
    },
  ]
}

export function BoxAssemblyView({
  activeFaceId = null,
  boxInput,
  name,
  onFaceHighlightChange,
  onSequenceStepChange,
  unitSystem,
}: BoxAssemblyViewProps) {
  const sequenceSteps = useMemo(() => getAssemblySequenceSteps(boxInput.style), [boxInput.style])
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const viewportWidth = 360
  const viewportHeight = 280
  const scale = Math.min(
    2.6,
    148 /
      Math.max(
        boxInput.externalLengthMm + boxInput.externalWidthMm,
        boxInput.externalHeightMm * 2.2,
        1,
      ),
  )
  const length = boxInput.externalLengthMm * scale
  const width = boxInput.externalWidthMm * scale
  const height = boxInput.externalHeightMm * scale
  const lipInset = Math.min(length, width) * 0.14
  const lipDepth = Math.min(height * 0.28, Math.min(length, width) * 0.18)
  const frontLeftBottom = projectPoint(0, 0, 0)
  const frontRightBottom = projectPoint(length, 0, 0)
  const backRightBottom = projectPoint(length, width, 0)
  const backLeftBottom = projectPoint(0, width, 0)
  const frontLeftTop = projectPoint(0, 0, height)
  const frontRightTop = projectPoint(length, 0, height)
  const backRightTop = projectPoint(length, width, height)
  const backLeftTop = projectPoint(0, width, height)
  const innerFrontLeft = projectPoint(lipInset, lipInset, height - lipDepth)
  const innerFrontRight = projectPoint(length - lipInset, lipInset, height - lipDepth)
  const innerBackRight = projectPoint(length - lipInset, width - lipInset, height - lipDepth)
  const innerBackLeft = projectPoint(lipInset, width - lipInset, height - lipDepth)
  const translatedPoints = translatePoints(
    [
      frontLeftBottom,
      frontRightBottom,
      backRightBottom,
      backLeftBottom,
      frontLeftTop,
      frontRightTop,
      backRightTop,
      backLeftTop,
      innerFrontLeft,
      innerFrontRight,
      innerBackRight,
      innerBackLeft,
    ],
    viewportWidth,
    viewportHeight - 18,
  )

  const [
    translatedFrontLeftBottom,
    translatedFrontRightBottom,
    translatedBackRightBottom,
    translatedFrontLeftTop,
    translatedFrontRightTop,
    translatedBackRightTop,
    translatedBackLeftTop,
    translatedInnerFrontLeft,
    translatedInnerFrontRight,
    translatedInnerBackRight,
    translatedInnerBackLeft,
  ] = translatedPoints

  const frontFace = [
    translatedFrontLeftBottom!,
    translatedFrontRightBottom!,
    translatedFrontRightTop!,
    translatedFrontLeftTop!,
  ]
  const sideFace = [
    translatedFrontRightBottom!,
    translatedBackRightBottom!,
    translatedBackRightTop!,
    translatedFrontRightTop!,
  ]
  const topFace = [
    translatedFrontLeftTop!,
    translatedFrontRightTop!,
    translatedBackRightTop!,
    translatedBackLeftTop!,
  ]
  const innerOpening = [
    translatedInnerFrontLeft!,
    translatedInnerFrontRight!,
    translatedInnerBackRight!,
    translatedInnerBackLeft!,
  ]
  const frontLabel = getPolygonCenter(frontFace)
  const sideLabel = getPolygonCenter(sideFace)
  const topLabel = getPolygonCenter(topFace)
  const styleLabel = getStyleLabel(boxInput.style)
  const activeStep = sequenceSteps[activeStepIndex]!
  const effectiveActiveFaceId = activeFaceId ?? activeStep.focusFaceId

  useEffect(() => {
    setActiveStepIndex(0)
    setIsPlaying(true)
  }, [boxInput.style])

  useEffect(() => {
    if (!isPlaying || sequenceSteps.length < 2) {
      return
    }

    const intervalId = window.setInterval(() => {
      setActiveStepIndex((currentIndex) => (currentIndex + 1) % sequenceSteps.length)
    }, 1600)

    return () => window.clearInterval(intervalId)
  }, [isPlaying, sequenceSteps.length])

  useEffect(() => {
    onSequenceStepChange?.(activeStep.id, activeStep.focusFaceId)
  }, [activeStep.focusFaceId, activeStep.id, onSequenceStepChange])

  const frontFaceStyle: CSSProperties = {
    transformBox: 'fill-box',
    transformOrigin: 'center bottom',
    transform: `translateY(${roundToString((1 - activeStep.bodyProgress) * 52)}px) scale(1, ${roundToString(
      0.38 + activeStep.bodyProgress * 0.62,
    )})`,
    opacity: 0.5 + activeStep.bodyProgress * 0.5,
  }
  const sideFaceStyle: CSSProperties = {
    transformBox: 'fill-box',
    transformOrigin: 'left bottom',
    transform: `translate(${roundToString((1 - activeStep.bodyProgress) * 28)}px, ${roundToString(
      (1 - activeStep.bodyProgress) * 18,
    )}px) scale(1, ${roundToString(0.38 + activeStep.bodyProgress * 0.62)})`,
    opacity: 0.5 + activeStep.bodyProgress * 0.5,
  }
  const topFaceStyle: CSSProperties = {
    transformBox: 'fill-box',
    transformOrigin: 'center center',
    transform: `translateY(${roundToString((1 - activeStep.topProgress) * -16)}px) scale(${roundToString(
      0.92 + activeStep.topProgress * 0.08,
    )})`,
    opacity: 0.38 + activeStep.topProgress * 0.62,
  }

  function roundToString(value: number) {
    return (Math.round(value * 100) / 100).toString()
  }

  function buildFaceClass(baseClass: string, faceId: AssemblyFaceId) {
    return `${baseClass}${effectiveActiveFaceId === faceId ? ' is-highlighted' : ''}`
  }

  function buildFaceGroupProps(faceId: AssemblyFaceId) {
    return {
      role: 'button' as const,
      tabIndex: 0,
      'data-face-id': faceId,
      className: 'assembly-view__face-group',
      onMouseEnter: () => onFaceHighlightChange?.(faceId),
      onMouseLeave: () => onFaceHighlightChange?.(null),
      onFocus: () => onFaceHighlightChange?.(faceId),
      onBlur: () => onFaceHighlightChange?.(null),
    }
  }

  return (
    <div className="assembly-view">
      <svg
        className="assembly-view__scene"
        viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
        role="img"
        aria-label={`${name} assembled 3D view`}
      >
        <ellipse className="assembly-view__shadow" cx="180" cy="242" rx="102" ry="24" />
        <g {...buildFaceGroupProps('front')} style={frontFaceStyle}>
          <path
            d={polygonToPath(frontFace)}
            className={buildFaceClass('assembly-view__face assembly-view__face--front', 'front')}
          />
          <text x={frontLabel.x} y={frontLabel.y} className="assembly-view__face-label">
            Front
          </text>
        </g>
        <g {...buildFaceGroupProps('side')} style={sideFaceStyle}>
          <path
            d={polygonToPath(sideFace)}
            className={buildFaceClass('assembly-view__face assembly-view__face--side', 'side')}
          />
          <text
            x={sideLabel.x}
            y={sideLabel.y}
            className="assembly-view__face-label assembly-view__face-label--muted"
          >
            Side
          </text>
        </g>
        {boxInput.style === 'open-tray' ? (
          <g {...buildFaceGroupProps('top')} style={topFaceStyle}>
            <path
              d={polygonToPath(topFace)}
              className={buildFaceClass('assembly-view__face assembly-view__face--rim', 'top')}
            />
            <path
              d={polygonToPath(innerOpening)}
              className={`assembly-view__opening${effectiveActiveFaceId === 'top' ? ' is-highlighted' : ''}`}
            />
            <path
              d={`M ${translatedFrontLeftTop!.x} ${translatedFrontLeftTop!.y} L ${translatedInnerFrontLeft!.x} ${translatedInnerFrontLeft!.y} L ${translatedInnerFrontRight!.x} ${translatedInnerFrontRight!.y} L ${translatedFrontRightTop!.x} ${translatedFrontRightTop!.y}`}
              className={`assembly-view__rim-line${effectiveActiveFaceId === 'top' ? ' is-highlighted' : ''}`}
            />
            <path
              d={`M ${translatedFrontRightTop!.x} ${translatedFrontRightTop!.y} L ${translatedInnerFrontRight!.x} ${translatedInnerFrontRight!.y} L ${translatedInnerBackRight!.x} ${translatedInnerBackRight!.y} L ${translatedBackRightTop!.x} ${translatedBackRightTop!.y}`}
              className={`assembly-view__rim-line${effectiveActiveFaceId === 'top' ? ' is-highlighted' : ''}`}
            />
            <text x={topLabel.x} y={topLabel.y} className="assembly-view__face-label">
              {getTopFaceLabel(boxInput.style)}
            </text>
          </g>
        ) : (
          <g {...buildFaceGroupProps('top')} style={topFaceStyle}>
            <path
              d={polygonToPath(topFace)}
              className={buildFaceClass('assembly-view__face assembly-view__face--top', 'top')}
            />
            <path
              d={`M ${translatedFrontLeftTop!.x} ${translatedFrontLeftTop!.y} L ${translatedBackRightTop!.x} ${translatedBackRightTop!.y}`}
              className={`assembly-view__closure-line${effectiveActiveFaceId === 'top' ? ' is-highlighted' : ''}`}
            />
            <text x={topLabel.x} y={topLabel.y} className="assembly-view__face-label">
              {getTopFaceLabel(boxInput.style)}
            </text>
          </g>
        )}
      </svg>
      <div className="assembly-view__sequence-header">
        <div>
          <strong>{activeStep.title}</strong>
          <p>{activeStep.description}</p>
        </div>
        <div className="toolbar-group assembly-view__controls">
          <span className="tag">
            Step {activeStepIndex + 1} of {sequenceSteps.length}
          </span>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => setIsPlaying((currentValue) => !currentValue)}
          >
            {isPlaying ? 'Pause Sequence' : 'Play Sequence'}
          </button>
        </div>
      </div>
      <div className="assembly-view__steps" aria-label="Assembly sequence steps">
        {sequenceSteps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            className={`assembly-view__step${index === activeStepIndex ? ' active' : ''}`}
            onClick={() => {
              setActiveStepIndex(index)
              setIsPlaying(false)
            }}
          >
            <span>{index + 1}</span>
            {step.title}
          </button>
        ))}
      </div>
      <div className="assembly-view__meta" aria-label="Assembly dimensions">
        <span className="meta-chip">{formatLength(boxInput.externalLengthMm, unitSystem)} L</span>
        <span className="meta-chip">{formatLength(boxInput.externalWidthMm, unitSystem)} W</span>
        <span className="meta-chip">{formatLength(boxInput.externalHeightMm, unitSystem)} H</span>
        <span className="meta-chip">{styleLabel}</span>
      </div>
    </div>
  )
}
