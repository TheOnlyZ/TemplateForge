export type UnitSystem = 'metric' | 'imperial'
export type LengthMm = number

export const MM_PER_INCH = 25.4
export const DEFAULT_PRINT_TOLERANCE_MM = 0.5

function roundToPrecision(value: number, decimals: number) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function convertInchesToMm(value: number) {
  return roundToPrecision(value * MM_PER_INCH, 6)
}

export function convertMmToInches(value: number) {
  return roundToPrecision(value / MM_PER_INCH, 6)
}

export function roundForDisplay(mm: LengthMm, unitSystem: UnitSystem) {
  if (unitSystem === 'imperial') {
    return roundToPrecision(convertMmToInches(mm), 3)
  }

  return roundToPrecision(mm, 2)
}

export function formatLength(mm: LengthMm, unitSystem: UnitSystem) {
  const value = roundForDisplay(mm, unitSystem)
  const suffix = unitSystem === 'imperial' ? 'in' : 'mm'

  return `${value} ${suffix}`
}

export function withinTolerance(
  actualMm: LengthMm,
  expectedMm: LengthMm,
  toleranceMm = DEFAULT_PRINT_TOLERANCE_MM,
) {
  return Math.abs(actualMm - expectedMm) <= toleranceMm
}
