import type { TemplateItem } from '../templates/index.ts'

export type ValidationSeverity = 'warning' | 'error'
export type ValidationCode =
  | 'min-dimension'
  | 'max-dimension'
  | 'tab-too-small'
  | 'page-count-warning'
  | 'page-count-limit'
  | 'printable-area-overflow'
  | 'impossible-layout'

export interface ValidationMessage {
  code: ValidationCode
  severity: ValidationSeverity
  message: string
  targetId?: string
}

export interface ValidationResult {
  valid: boolean
  messages: ValidationMessage[]
}

export interface TemplateInputValidationOptions {
  dimensionsMm: Record<string, number>
  minDimensionMm?: number
  maxDimensionMm?: number
}

export interface TemplateGeometryValidationOptions {
  minimumTabWidthMm?: number
}

export interface LayoutValidationOptions {
  pageCount: number
  warningPageCount?: number
  maxPageCount?: number
  printableAreaOverflow?: boolean
  hasLegalPlacement?: boolean
}

export const DEFAULT_MIN_DIMENSION_MM = 12.7
export const DEFAULT_MAX_DIMENSION_MM = 914.4
export const DEFAULT_PAGE_WARNING_COUNT = 8
export const DEFAULT_MAX_PAGE_COUNT = 24
export const DEFAULT_MINIMUM_TAB_WIDTH_MM = 6

function buildValidationResult(messages: ValidationMessage[]): ValidationResult {
  return {
    valid: !messages.some((message) => message.severity === 'error'),
    messages,
  }
}

export function mergeValidationResults(...results: ValidationResult[]): ValidationResult {
  return buildValidationResult(results.flatMap((result) => result.messages))
}

export function validateTemplateInput(
  options: TemplateInputValidationOptions,
): ValidationResult {
  const minDimensionMm = options.minDimensionMm ?? DEFAULT_MIN_DIMENSION_MM
  const maxDimensionMm = options.maxDimensionMm ?? DEFAULT_MAX_DIMENSION_MM
  const messages: ValidationMessage[] = []

  for (const [dimensionName, valueMm] of Object.entries(options.dimensionsMm)) {
    if (valueMm < minDimensionMm) {
      messages.push({
        code: 'min-dimension',
        severity: 'error',
        message: `${dimensionName} is below the supported minimum dimension of ${minDimensionMm} mm.`,
      })
    }

    if (valueMm > maxDimensionMm) {
      messages.push({
        code: 'max-dimension',
        severity: 'error',
        message: `${dimensionName} exceeds the supported maximum dimension of ${maxDimensionMm} mm.`,
      })
    }
  }

  return buildValidationResult(messages)
}

export function validateTemplateGeometry(
  template: TemplateItem,
  options: TemplateGeometryValidationOptions = {},
): ValidationResult {
  const minimumTabWidthMm = options.minimumTabWidthMm ?? DEFAULT_MINIMUM_TAB_WIDTH_MM
  const messages: ValidationMessage[] = []

  for (const tab of template.tabs) {
    if (tab.widthMm < minimumTabWidthMm) {
      messages.push({
        code: 'tab-too-small',
        severity: 'warning',
        targetId: tab.id,
        message: `Tab ${tab.label ?? tab.id} is narrower than the recommended ${minimumTabWidthMm} mm minimum.`,
      })
    }
  }

  return buildValidationResult(messages)
}

export function validateLayoutResult(options: LayoutValidationOptions): ValidationResult {
  const warningPageCount = options.warningPageCount ?? DEFAULT_PAGE_WARNING_COUNT
  const maxPageCount = options.maxPageCount ?? DEFAULT_MAX_PAGE_COUNT
  const messages: ValidationMessage[] = []

  if (options.printableAreaOverflow) {
    messages.push({
      code: 'printable-area-overflow',
      severity: 'error',
      message: 'The generated layout exceeds the configured printable area.',
    })
  }

  if (options.hasLegalPlacement === false) {
    messages.push({
      code: 'impossible-layout',
      severity: 'error',
      message: 'The current geometry cannot be placed or split using the supported rules.',
    })
  }

  if (options.pageCount > maxPageCount) {
    messages.push({
      code: 'page-count-limit',
      severity: 'error',
      message: `This layout would require ${options.pageCount} pages, which exceeds the ${maxPageCount}-page export limit.`,
    })
  } else if (options.pageCount > warningPageCount) {
    messages.push({
      code: 'page-count-warning',
      severity: 'warning',
      message: `This layout would require ${options.pageCount} pages. Consider simplifying the design before export.`,
    })
  }

  return buildValidationResult(messages)
}
