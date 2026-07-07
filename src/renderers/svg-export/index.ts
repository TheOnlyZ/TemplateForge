import type { TemplateItem } from '../../domain/templates/index.ts'
import { renderTemplatePreview } from '../svg-preview/index.ts'

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    if (character === '&') {
      return '&amp;'
    }

    if (character === '<') {
      return '&lt;'
    }

    if (character === '>') {
      return '&gt;'
    }

    if (character === '"') {
      return '&quot;'
    }

    return '&apos;'
  })
}

export function exportTemplateToSvg(template: TemplateItem) {
  const scene = renderTemplatePreview(template)
  const templateName = escapeXml(template.name)

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}mm" height="${scene.height}mm" viewBox="${scene.viewBox}" role="img" aria-label="${templateName}">
  <title>${templateName}</title>
  <desc>TemplateForge shape export for ${templateName}</desc>
  <defs>
    <style>
      .panel { fill: rgba(122, 162, 255, 0.12); stroke: rgba(122, 162, 255, 0.2); stroke-width: 1; }
      .cut, .tab { fill: none; stroke: #1f2937; stroke-width: 1.4; stroke-linejoin: round; stroke-linecap: round; }
      .fold { fill: none; stroke: #4f7dff; stroke-width: 1.2; stroke-dasharray: 6 4; }
      .label { fill: #111827; font-size: 11px; text-anchor: middle; dominant-baseline: middle; font-family: Inter, Arial, sans-serif; }
    </style>
  </defs>
  <g data-kind="panels">
    ${scene.panelPaths.map((path) => `<path class="panel" d="${path.d}" />`).join('\n    ')}
  </g>
  <g data-kind="cuts">
    ${scene.cutPaths.map((path) => `<path class="cut" d="${path.d}" />`).join('\n    ')}
  </g>
  <g data-kind="tabs">
    ${scene.tabPaths.map((path) => `<path class="tab" d="${path.d}" />`).join('\n    ')}
  </g>
  <g data-kind="folds">
    ${scene.foldPaths.map((path) => `<path class="fold" d="${path.d}" />`).join('\n    ')}
  </g>
  <g data-kind="labels">
    ${scene.labels.map((label) => `<text class="label" x="${label.x}" y="${label.y}">${escapeXml(label.text)}</text>`).join('\n    ')}
  </g>
</svg>
`
}
