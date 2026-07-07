export function downloadBytes(bytes: Uint8Array, fileName: string, mimeType: string) {
  const normalizedBytes = Uint8Array.from(bytes)
  const blob = new Blob([normalizedBytes], { type: mimeType })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}

export function downloadText(contents: string, fileName: string, mimeType: string) {
  downloadBytes(new TextEncoder().encode(contents), fileName, mimeType)
}

function normalizeItemName(itemName: string) {
  return itemName.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'TemplateForge'
}

export function buildPdfFileName(itemName: string, paperSizeId: string) {
  return `${normalizeItemName(itemName)}_${paperSizeId.toUpperCase()}.pdf`
}

export function buildProjectPdfFileName(projectName: string, itemCount: number) {
  return `${normalizeItemName(projectName)}_${itemCount}_items.pdf`
}

export function buildProjectStateFileName(projectName: string) {
  return `${normalizeItemName(projectName)}.templateforge.json`
}

export function buildSvgFileName(itemName: string) {
  return `${normalizeItemName(itemName)}.svg`
}
