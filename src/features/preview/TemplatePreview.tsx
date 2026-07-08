import { renderTemplatePreview } from '../../renderers/svg-preview/index.ts'
import type { TemplateItem } from '../../domain/templates/index.ts'

interface TemplatePreviewProps {
  template: TemplateItem
  highlightedTargetIds?: Set<string> | undefined
  highlightedFoldIds?: Set<string> | undefined
}

export function TemplatePreview({
  template,
  highlightedFoldIds,
  highlightedTargetIds,
}: TemplatePreviewProps) {
  const scene = renderTemplatePreview(template)

  function isHighlighted(targetIds: string[]) {
    return targetIds.some((targetId) => highlightedTargetIds?.has(targetId))
  }

  return (
    <svg className="template-preview" viewBox={scene.viewBox} role="img" aria-label={template.name}>
      <g className="template-preview__panels">
        {scene.panelPaths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            className={`template-preview__panel${highlightedTargetIds?.has(path.id) ? ' is-highlighted' : ''}`}
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
          <path
            key={path.id}
            d={path.d}
            className={`template-preview__tab${highlightedTargetIds?.has(path.id) ? ' is-highlighted' : ''}`}
          />
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
            className={`template-preview__label${isHighlighted(label.targetIds) ? ' is-highlighted' : ''}`}
          >
            {label.text}
          </text>
        ))}
      </g>
    </svg>
  )
}
