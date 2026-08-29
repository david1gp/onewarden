export function cipherPasswordStrengthCalculate(
  password: string | null | undefined,
): "Weak" | "Medium" | "Strong" | "Very Strong" | null {
  if (!password || password.length === 0) return null

  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 14) score += 1
  if (password.length >= 20) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1

  if (score <= 2) return "Weak"
  if (score <= 3) return "Medium"
  if (score <= 4) return "Strong"
  return "Very Strong"
}
