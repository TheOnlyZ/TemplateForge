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

export function buildPdfFileName(itemName: string, paperSizeId: string) {
  const safeName =
    itemName.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'TemplateForge'

  return `${safeName}_${paperSizeId.toUpperCase()}.pdf`
}
