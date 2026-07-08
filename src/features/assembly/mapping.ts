import type { LayoutResult } from '../../domain/layout/index.ts'
import type { TemplateItem } from '../../domain/templates/index.ts'

export interface AssemblyPartMapping {
  partId: string
  partName: string
  pageNumbers: number[]
  pageLabels: string[]
  tileCount: number
}

function buildPageLabel(page: LayoutResult['pages'][number]) {
  return `Page ${page.pageNumber}`
}

export function buildAssemblyPartMappings(
  template: TemplateItem,
  layout: LayoutResult,
): AssemblyPartMapping[] {
  return template.parts.map((part) => {
    const mappedPages = layout.pages.filter((page) =>
      page.partPlacements.some((placement) => placement.partId === part.id),
    )

    return {
      partId: part.id,
      partName: part.name,
      pageNumbers: mappedPages.map((page) => page.pageNumber),
      pageLabels: mappedPages.map(buildPageLabel),
      tileCount: mappedPages.length,
    }
  })
}
