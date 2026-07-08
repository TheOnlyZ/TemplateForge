import { type PointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import type { AssemblyPartMapping } from './mapping.ts'
import type {
  AssemblyFaceId,
  AssemblyMode,
  AssemblyModel,
  AssemblySequenceStepId,
} from './model.ts'
import type { CylinderInput } from '../../domain/shapes/cylinder/index.ts'
import { formatLength, type UnitSystem } from '../../domain/units/index.ts'

interface CylinderAssemblyViewProps {
  name: string
  cylinderInput: CylinderInput
  model: AssemblyModel
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

function getCueText(cueKind: AssemblyModel['steps'][number]['cueKind']) {
  if (cueKind === 'fold-in') {
    return 'Fold In'
  }

  if (cueKind === 'fold-over') {
    return 'Fold Over'
  }

  if (cueKind === 'glue-here') {
    return 'Glue Here'
  }

  return 'Press Secure'
}

function getCylinderFaceClass(faceId: AssemblyFaceId, activeFaceId: AssemblyFaceId | null, isTransparent: boolean) {
  return `assembly-view__face assembly-view__face--${faceId}${activeFaceId === faceId ? ' is-highlighted' : ''}${isTransparent ? ' is-transparent' : ''}`
}

export function CylinderAssemblyView({
  activeFaceId = null,
  activeStepId = null,
  cylinderInput,
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
}: CylinderAssemblyViewProps) {
  const [isTransparent, setIsTransparent] = useState(false)
  const [isPlayingSequence, setIsPlayingSequence] = useState(false)
  const [yaw, setYaw] = useState(0)
  const dragStateRef = useRef<{ pointerId: number; x: number } | null>(null)
  const activeStep = useMemo(
    () => model.steps.find((step) => step.id === activeStepId) ?? model.steps[0] ?? null,
    [activeStepId, model.steps],
  )

  useEffect(() => {
    if (mode !== 'sequence') {
      setIsPlayingSequence(false)
      return
    }

    if (activeStep === null && model.steps[0]) {
      onStepChange?.(model.steps[0]!.id)
    }
  }, [activeStep, mode, model.steps, onStepChange])

  useEffect(() => {
    if (mode !== 'sequence' || !isPlayingSequence || model.steps.length < 2 || activeStep === null) {
      return
    }

    const intervalId = window.setInterval(() => {
      const currentIndex = model.steps.findIndex((step) => step.id === activeStep.id)
      onStepChange?.(model.steps[(currentIndex + 1) % model.steps.length]!.id)
    }, SEQUENCE_ADVANCE_MS)

    return () => window.clearInterval(intervalId)
  }, [activeStep, isPlayingSequence, mode, model.steps, onStepChange])

  const effectiveActiveFaceId = activeFaceId ?? (mode === 'sequence' ? activeStep?.focusFaceId ?? null : null)
  const bodyWidth = Math.min(220, Math.max(110, cylinderInput.diameterMm * 1.8))
  const bodyHeight = Math.min(170, Math.max(95, cylinderInput.heightMm * 1.5))
  const topY = 90
  const bottomY = topY + bodyHeight
  const centerX = VIEWPORT_WIDTH / 2
  const ellipseHeight = 26
  const yawSine = Math.sin(yaw)
  const ellipseWidth = bodyWidth * (0.56 + Math.abs(Math.cos(yaw)) * 0.2)
  const sideOffset = yawSine * bodyWidth * 0.18
  const bodyExplode = mode === 'exploded' ? 18 : 0
  const topExplode =
    mode === 'exploded' ? 28 : mode === 'sequence' && activeStep?.focusFaceId === 'top' ? 20 : 0
  const bottomExplode =
    mode === 'exploded' ? 28 : mode === 'sequence' && activeStep?.focusFaceId === 'bottom' ? 20 : 0
  const bodyTranslateX = mode === 'sequence' && activeStep?.id === 'curve-body-wrap' ? 22 : bodyExplode
  const seamCueX = centerX + ellipseWidth / 2 + 18
  const topCenterY = topY - topExplode
  const bottomCenterY = bottomY + bottomExplode
  const leftX = centerX - ellipseWidth / 2 + sideOffset + bodyTranslateX
  const rightX = centerX + ellipseWidth / 2 + sideOffset + bodyTranslateX
  const bodyPath = `M ${leftX} ${topCenterY} A ${ellipseWidth / 2} ${ellipseHeight / 2} 0 0 1 ${rightX} ${topCenterY} L ${rightX} ${bottomCenterY} A ${ellipseWidth / 2} ${ellipseHeight / 2} 0 0 1 ${leftX} ${bottomCenterY} Z`

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    dragStateRef.current = { pointerId: event.pointerId, x: event.clientX }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - dragState.x
    dragStateRef.current = { pointerId: event.pointerId, x: event.clientX }
    setYaw((currentYaw) => currentYaw + deltaX * 0.012)
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
        <ellipse className="assembly-view__shadow" cx={centerX} cy={285} rx={120} ry={22} />
        <g
          data-face-id="body"
          className="assembly-view__face-layer"
          role="button"
          tabIndex={0}
          onMouseEnter={() => onFaceHoverChange?.('body')}
          onMouseLeave={() => onFaceHoverChange?.(null)}
          onFocus={() => onFaceHoverChange?.('body')}
          onBlur={() => onFaceHoverChange?.(null)}
          onClick={() => onFaceSelect?.(selectedFaceId === 'body' ? null : 'body')}
        >
          <path d={bodyPath} className={getCylinderFaceClass('body', effectiveActiveFaceId, isTransparent)} />
          <text x={centerX + sideOffset + bodyTranslateX} y={(topCenterY + bottomCenterY) / 2} className={`assembly-view__face-label${effectiveActiveFaceId === 'body' ? ' is-highlighted' : ''}`}>
            Body
          </text>
        </g>
        <g
          data-face-id="top"
          className="assembly-view__face-layer"
          role="button"
          tabIndex={0}
          onMouseEnter={() => onFaceHoverChange?.('top')}
          onMouseLeave={() => onFaceHoverChange?.(null)}
          onFocus={() => onFaceHoverChange?.('top')}
          onBlur={() => onFaceHoverChange?.(null)}
          onClick={() => onFaceSelect?.(selectedFaceId === 'top' ? null : 'top')}
        >
          <ellipse
            cx={centerX}
            cy={topCenterY}
            rx={ellipseWidth / 2}
            ry={ellipseHeight / 2}
            className={getCylinderFaceClass('top', effectiveActiveFaceId, isTransparent)}
          />
          <text x={centerX} y={topCenterY} className={`assembly-view__face-label${effectiveActiveFaceId === 'top' ? ' is-highlighted' : ''}`}>
            Top
          </text>
        </g>
        <g
          data-face-id="bottom"
          className="assembly-view__face-layer"
          role="button"
          tabIndex={0}
          onMouseEnter={() => onFaceHoverChange?.('bottom')}
          onMouseLeave={() => onFaceHoverChange?.(null)}
          onFocus={() => onFaceHoverChange?.('bottom')}
          onBlur={() => onFaceHoverChange?.(null)}
          onClick={() => onFaceSelect?.(selectedFaceId === 'bottom' ? null : 'bottom')}
        >
          <ellipse
            cx={centerX}
            cy={bottomCenterY}
            rx={ellipseWidth / 2}
            ry={ellipseHeight / 2}
            className={getCylinderFaceClass('bottom', effectiveActiveFaceId, isTransparent)}
          />
          {(mode !== 'finished' || effectiveActiveFaceId === 'bottom') && (
            <text x={centerX} y={bottomCenterY} className={`assembly-view__face-label${effectiveActiveFaceId === 'bottom' ? ' is-highlighted' : ''}`}>
              Bottom
            </text>
          )}
        </g>
        {mode === 'sequence' && activeStep && (
          <g className="assembly-view__cue" aria-label="Fold direction cue">
            <path
              d={`M ${seamCueX - 40} ${topCenterY + 36} L ${seamCueX - 4} ${topCenterY + 10}`}
              className="assembly-view__cue-line"
            />
            <path
              d={`M ${seamCueX - 8} ${topCenterY + 8} L ${seamCueX + 2} ${topCenterY + 10} L ${seamCueX - 2} ${topCenterY + 18} Z`}
              className="assembly-view__cue-arrow"
            />
            <g className="assembly-view__cue-badge">
              <rect x={seamCueX - 86} y={topCenterY + 46} width="82" height="22" rx="11" />
              <text x={seamCueX - 45} y={topCenterY + 60}>
                {getCueText(activeStep.cueKind)}
              </text>
            </g>
          </g>
        )}
      </svg>

      <div className="assembly-view__summary-card">
        {mode === 'finished' && (
          <>
            <strong>This is the finished object.</strong>
            <p>Rotate the cylinder to orient yourself, then switch to Exploded View or Assembly Sequence to understand how the printed wrap and caps fit together.</p>
          </>
        )}
        {mode === 'exploded' && (
          <>
            <strong>This is how the cylinder is organized.</strong>
            <p>The caps separate from the body while staying aligned with their final positions, making the printed structure readable before you assemble it.</p>
          </>
        )}
        {mode === 'sequence' && activeStep && (
          <>
            <strong>{activeStep.title}</strong>
            <p>{activeStep.instruction}</p>
          </>
        )}
      </div>

      {mode === 'sequence' && activeStep && (
        <>
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

          <div className="assembly-view__steps" aria-label="Assembly sequence steps">
            {model.steps.map((step, index) => {
              const isCompleted = model.steps.findIndex((candidate) => candidate.id === activeStep.id) > index

              return (
                <button
                  key={step.id}
                  type="button"
                  className={`assembly-view__step${activeStep.id === step.id ? ' active' : ''}`}
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
        </>
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
        <span className="meta-chip">{formatLength(cylinderInput.diameterMm, unitSystem)} diameter</span>
        <span className="meta-chip">{formatLength(cylinderInput.heightMm, unitSystem)} height</span>
      </div>
    </div>
  )
}
