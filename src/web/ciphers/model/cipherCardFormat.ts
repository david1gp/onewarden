export function cipherCardFormat(cardNumber: string | null | undefined, concealed = false): string {
  if (!cardNumber) return ""
  const clean = cardNumber.replace(/\s+/g, "")
  if (concealed) {
    const last4 = clean.slice(-4)
    return `•••• •••• •••• ${last4}`
  }
  return clean.replace(/(\d{4})/g, "$1 ").trim()
}
