export function vaultCardPanMask(pan: string): string {
  const trimmed = pan.trim()
  if (!trimmed) return ""
  if (trimmed.includes("•") || trimmed.includes("*")) {
    return trimmed
  }

  const digits = trimmed.replace(/\D/g, "")
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)} •••• •••• ${digits.slice(-4)}`
  }
  if (digits.length >= 4) {
    return `•••• •••• •••• ${digits.slice(-4)}`
  }
  if (digits.length > 0) {
    return `•••• •••• •••• ${digits}`
  }
  return trimmed
}
