import type { MouseEvent } from 'react'
import { renderTemplatePreview } from '../../renderers/svg-preview/index.ts'
import type { TemplateItem } from '../../domain/templates/index.ts'
import type { AssemblyFaceId } from '../assembly/model.ts'

interface TemplatePreviewProps {
  template: TemplateItem
  selectedFaceId?: AssemblyFaceId | null
  faceTargetLookup?: Record<string, AssemblyFaceId> | undefined
  faceLabelLookup?: Record<string, string> | undefined
  glueTabIds?: Set<string> | undefined
  highlightedTargetIds?: Set<string> | undefined
  highlightedFoldIds?: Set<string> | undefined
  onFaceHoverChange?: (faceId: AssemblyFaceId | null) => void
  onFaceSelect?: (faceId: AssemblyFaceId | null) => void
}

export function TemplatePreview({
  selectedFaceId = null,
  faceTargetLookup,
  faceLabelLookup,
  glueTabIds,
  template,
  highlightedFoldIds,
  highlightedTargetIds,
  onFaceHoverChange,
  onFaceSelect,
}: TemplatePreviewProps) {
  const scene = renderTemplatePreview(template)

  function isHighlighted(targetIds: string[]) {
    return targetIds.some((targetId) => highlightedTargetIds?.has(targetId))
  }

  function getFaceIdForTarget(targetId: string) {
    return faceTargetLookup?.[targetId]
  }

  function getFaceIdForLabel(targetIds: string[]) {
    return targetIds.map(getFaceIdForTarget).find((faceId): faceId is AssemblyFaceId => faceId !== undefined)
  }

  function getDisplayLabel(labelText: string, targetIds: string[]) {
    const normalizedLabels = [...new Set(targetIds.map((targetId) => faceLabelLookup?.[targetId]).filter(Boolean))]

    return normalizedLabels.length === 1 ? normalizedLabels[0]! : labelText
  }

  function buildInteractiveProps(faceId: AssemblyFaceId | undefined) {
    if (faceId === undefined) {
      return {}
    }

    return {
      'data-face-id': faceId,
      role: 'button' as const,
      tabIndex: 0,
      onMouseEnter: () => onFaceHoverChange?.(faceId),
      onMouseLeave: () => onFaceHoverChange?.(null),
      onFocus: () => onFaceHoverChange?.(faceId),
      onBlur: () => onFaceHoverChange?.(null),
      onClick: (event: MouseEvent<SVGElement>) => {
        event.stopPropagation()
        onFaceSelect?.(selectedFaceId === faceId ? null : faceId)
      },
    }
  }

  return (
    <svg
      className="template-preview"
      viewBox={scene.viewBox}
      role="img"
      aria-label={template.name}
      onClick={() => onFaceSelect?.(null)}
    >
      <g className="template-preview__panels">
        {scene.panelPaths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            className={`template-preview__panel${highlightedTargetIds?.has(path.id) ? ' is-highlighted' : ''}${getFaceIdForTarget(path.id) ? ' is-interactive' : ''}`}
            {...buildInteractiveProps(getFaceIdForTarget(path.id))}
          />
        ))}
      </g>
      <g className="template-preview__cuts">
        {scene.cutPaths.map((path) => (
          <path key={path.id} d={path.d} className="template-preview__cut" />
        ))}
      </g>
      <g className="template-preview__tabs">
        {scene.tabPaths.map((path) => (
          <g key={path.id}>
            <path
              d={path.d}
              className={`template-preview__tab${highlightedTargetIds?.has(path.id) ? ' is-highlighted' : ''}${glueTabIds?.has(path.id) ? ' is-glue' : ''}${getFaceIdForTarget(path.id) ? ' is-interactive' : ''}`}
              {...buildInteractiveProps(getFaceIdForTarget(path.id))}
            />
            {glueTabIds?.has(path.id) && <title>Glue Tab</title>}
          </g>
        ))}
      </g>
      <g className="template-preview__folds">
        {scene.foldPaths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            className={`template-preview__fold${highlightedFoldIds?.has(path.id) ? ' is-highlighted' : ''}`}
          />
        ))}
      </g>
      <g className="template-preview__labels">
        {scene.labels.map((label) => (
          <text
            key={label.id}
            x={label.x}
            y={label.y}
            className={`template-preview__label${isHighlighted(label.targetIds) ? ' is-highlighted' : ''}${getFaceIdForLabel(label.targetIds) ? ' is-interactive' : ''}`}
            {...buildInteractiveProps(getFaceIdForLabel(label.targetIds))}
          >
            {getDisplayLabel(label.text, label.targetIds)}
          </text>
        ))}
      </g>
    </svg>
  )
}
