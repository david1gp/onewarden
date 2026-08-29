export function cipherCardBrandDetect(cardNumber: string | null | undefined): string {
  if (!cardNumber) return "Unknown"
  const digits = cardNumber.replace(/\D/g, "")

  if (/^4/.test(digits)) return "Visa"
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard"
  if (/^3[47]/.test(digits)) return "American Express"
  if (/^(6011|65|64[4-9]|622)/.test(digits)) return "Discover"
  if (/^35/.test(digits)) return "JCB"
  if (/^3(0[0-5]|[68])/.test(digits)) return "Diners Club"
  if (/^62/.test(digits)) return "UnionPay"

  return "Unknown"
}
