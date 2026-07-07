import { describe, expect, it } from 'vitest'
import { generateBoxTemplate } from '../../../../src/domain/shapes/box/index.ts'
import { exportTemplateToSvg } from '../../../../src/renderers/svg-export/index.ts'

describe('exportTemplateToSvg', () => {
  it('creates a standalone SVG with physical dimensions from the canonical template', () => {
    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 140,
        externalWidthMm: 90,
        externalHeightMm: 35,
        glueTabWidthMm: 14,
        style: 'tuck-carton',
      },
      {
        itemId: 'svg-box',
        itemName: 'SVG Box',
      },
    )

    const svg = exportTemplateToSvg(template)

    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('width="')
    expect(svg).toContain('height="')
    expect(svg).toContain('mm"')
    expect(svg).toContain('<path class="cut"')
    expect(svg).toContain('<path class="fold"')
  })

  it('escapes user-provided template and label text', () => {
    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 120,
        externalWidthMm: 80,
        externalHeightMm: 24,
        glueTabWidthMm: 12,
        style: 'open-tray',
      },
      {
        itemId: 'svg-box-escaped',
        itemName: 'Front & Back <Tray> "A"',
      },
    )

    template.annotations[0] = {
      ...template.annotations[0]!,
      text: 'Fold & Lock <Here>',
    }

    const svg = exportTemplateToSvg(template)

    expect(svg).toContain('&amp;')
    expect(svg).toContain('&lt;Tray&gt;')
    expect(svg).toContain('&quot;A&quot;')
    expect(svg).toContain('Fold &amp; Lock &lt;Here&gt;')
  })
})
