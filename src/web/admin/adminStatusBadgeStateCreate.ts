import type { BadgeVariant } from "#ui/static/badge/badgeCva.jsx"

const badgeVariants: Record<string, BadgeVariant> = {
  active: "filledGreen",
  healthy: "filledGreen",
  disabled: "subtle",
  invited: "filledBlue",
  twoFactor: "filledGreen",
  verified: "filledGreen",
  sso: "filledBlue",
  overridden: "filledBlue",
  warning: "filledYellow",
  success: "filledGreen",
  info: "filledBlue",
  error: "filledRed",
  owner: "contrast",
  admin: "filledBlue",
  manager: "filledGreen",
  user: "outline",
  enterprise: "contrast",
  premium: "filledBlue",
  free: "outline",
}

export function adminStatusBadgeStateCreate(status: () => string) {
  const labels: Record<string, string> = {
    twoFactor: "2FA",
    sso: "SSO",
  }

  return {
    class: () => (status() === "warning" ? "text-slate-950" : undefined),
    label: () => labels[status()] ?? status().charAt(0).toUpperCase() + status().slice(1),
    variant: () => badgeVariants[status()] ?? "outline",
  }
}
