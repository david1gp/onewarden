import type { BadgeVariant } from "#ui/static/badge/badgeCva.jsx"

const badgeVariants: Record<string, BadgeVariant> = {
  active: "filledGreen",
  healthy: "filledGreen",
  disabled: "subtle",
  invited: "filledBlue",
  warning: "filledYellow",
  success: "filledGreen",
  info: "filledBlue",
  error: "filledRed",
  owner: "contrast",
  admin: "filledBlue",
  enterprise: "contrast",
  premium: "filledBlue",
  free: "outline",
}

export function adminStatusBadgeStateCreate(status: () => string) {
  return {
    class: () => (status() === "warning" ? "text-slate-950" : undefined),
    label: () => status().charAt(0).toUpperCase() + status().slice(1),
    variant: () => badgeVariants[status()] ?? "outline",
  }
}
