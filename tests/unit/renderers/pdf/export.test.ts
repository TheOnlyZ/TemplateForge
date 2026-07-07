import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { layoutTemplate } from '../../../../src/domain/layout/index.ts'
import { getDefaultMarginConfig, getPaperDefinition } from '../../../../src/domain/paper/index.ts'
import { generateBoxTemplate } from '../../../../src/domain/shapes/box/index.ts'
import { exportTemplateToPdf } from '../../../../src/renderers/pdf/index.ts'

describe('exportTemplateToPdf', () => {
  it('creates a readable single-page PDF from the canonical template and layout', async () => {
    const paper = getPaperDefinition('a4')
    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 140,
        externalWidthMm: 90,
        externalHeightMm: 35,
        glueTabWidthMm: 14,
        style: 'tuck-carton',
      },
      {
        itemId: 'pdf-box',
        itemName: 'PDF Box',
      },
    )
    const layout = layoutTemplate(template, paper, 'portrait', getDefaultMarginConfig())

    const bytes = await exportTemplateToPdf({ template, layout, paper })
    const pdf = await PDFDocument.load(bytes)

    expect(pdf.getPageCount()).toBe(1)
  })
})
