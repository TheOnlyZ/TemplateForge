import { DEFAULT_MARGIN_MM, type MarginConfig } from '../paper/index.ts'
import type { TemplateItem } from '../templates/index.ts'

export type ValidationSeverity = 'warning' | 'error'
export type ValidationCode =
  | 'min-dimension'
  | 'max-dimension'
  | 'tab-too-small'
  | 'margin-below-recommended'
  | 'printable-area-too-small'
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
  printableAreaWidthMm?: number
  printableAreaHeightMm?: number
  margins?: MarginConfig
  recommendedSafeMarginMm?: number
  minimumSafePrintableWidthMm?: number
  minimumSafePrintableHeightMm?: number
}

export const DEFAULT_MIN_DIMENSION_MM = 12.7
export const DEFAULT_MAX_DIMENSION_MM = 914.4
export const CYLINDER_MIN_DIAMETER_MM = 12.7
export const CYLINDER_MAX_DIAMETER_MM = 400
export const CYLINDER_MIN_HEIGHT_MM = 12.7
export const CYLINDER_MAX_HEIGHT_MM = 914.4
export const DEFAULT_PAGE_WARNING_COUNT = 8
export const DEFAULT_MAX_PAGE_COUNT = 24
export const DEFAULT_MINIMUM_TAB_WIDTH_MM = 6
export const DEFAULT_RECOMMENDED_SAFE_MARGIN_MM = DEFAULT_MARGIN_MM
export const DEFAULT_MINIMUM_SAFE_PRINTABLE_WIDTH_MM = 120
export const DEFAULT_MINIMUM_SAFE_PRINTABLE_HEIGHT_MM = 24

function roundForMessage(value: number) {
  return Math.round(value * 10) / 10
}

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

export function validateCylinderInput(options: {
  diameterMm: number
  heightMm: number
}): ValidationResult {
  const messages: ValidationMessage[] = []

  if (options.diameterMm < CYLINDER_MIN_DIAMETER_MM) {
    messages.push({
      code: 'min-dimension',
      severity: 'error',
      message: `Diameter is below the supported minimum of ${CYLINDER_MIN_DIAMETER_MM} mm.`,
    })
  }

  if (options.diameterMm > CYLINDER_MAX_DIAMETER_MM) {
    messages.push({
      code: 'max-dimension',
      severity: 'error',
      message: `Diameter exceeds the supported maximum of ${CYLINDER_MAX_DIAMETER_MM} mm — the resulting body wrap would be too wide for reliable layout.`,
    })
  }

  if (options.heightMm < CYLINDER_MIN_HEIGHT_MM) {
    messages.push({
      code: 'min-dimension',
      severity: 'error',
      message: `Height is below the supported minimum of ${CYLINDER_MIN_HEIGHT_MM} mm.`,
    })
  }

  if (options.heightMm > CYLINDER_MAX_HEIGHT_MM) {
    messages.push({
      code: 'max-dimension',
      severity: 'error',
      message: `Height exceeds the supported maximum of ${CYLINDER_MAX_HEIGHT_MM} mm.`,
    })
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
  const recommendedSafeMarginMm =
    options.recommendedSafeMarginMm ?? DEFAULT_RECOMMENDED_SAFE_MARGIN_MM
  const minimumSafePrintableWidthMm =
    options.minimumSafePrintableWidthMm ?? DEFAULT_MINIMUM_SAFE_PRINTABLE_WIDTH_MM
  const minimumSafePrintableHeightMm =
    options.minimumSafePrintableHeightMm ?? DEFAULT_MINIMUM_SAFE_PRINTABLE_HEIGHT_MM
  const messages: ValidationMessage[] = []

  if (options.margins !== undefined) {
    const lowestMargin = Math.min(
      options.margins.top,
      options.margins.right,
      options.margins.bottom,
      options.margins.left,
    )

    if (lowestMargin < recommendedSafeMarginMm) {
      messages.push({
        code: 'margin-below-recommended',
        severity: 'warning',
        message: `One or more margins are below the recommended ${recommendedSafeMarginMm} mm printer-safe margin. Some printers may clip registration or calibration marks near the page edge.`,
      })
    }
  }

  if (
    options.printableAreaWidthMm !== undefined &&
    options.printableAreaHeightMm !== undefined &&
    (options.printableAreaWidthMm < minimumSafePrintableWidthMm ||
      options.printableAreaHeightMm < minimumSafePrintableHeightMm)
  ) {
    messages.push({
      code: 'printable-area-too-small',
      severity: 'error',
      message: `The configured margins leave only ${roundForMessage(options.printableAreaWidthMm)} mm x ${roundForMessage(options.printableAreaHeightMm)} mm of printable area. Reduce margins or choose a larger sheet to keep at least ${minimumSafePrintableWidthMm} mm x ${minimumSafePrintableHeightMm} mm available for calibrated export.`,
    })
  }

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
