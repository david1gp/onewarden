export function cipherAttachmentFormatSize(sizeInBytes: number | string | undefined | null): string {
  if (sizeInBytes === undefined || sizeInBytes === null) {
    return "0 B"
  }
  const bytes = typeof sizeInBytes === "number" ? sizeInBytes : Number.parseInt(sizeInBytes, 10)
  if (Number.isNaN(bytes) || bytes <= 0) {
    return "0 B"
  }

  const units = ["B", "KB", "MB", "GB", "TB"]
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size < 10 && unitIndex > 0 ? size.toFixed(1) : Math.round(size)} ${units[unitIndex]}`
}
