import { vaultSvgIcons } from "./vaultSvgIcons.js"

const categoryIcons: Record<string, string> = {
  login: vaultSvgIcons.login,
  secureNote: vaultSvgIcons.secureNote,
  creditCard: vaultSvgIcons.creditCard,
  identity: vaultSvgIcons.identity,
  password: vaultSvgIcons.password,
  sshKey: vaultSvgIcons.sshKey,
}

export function vaultCategoryIconResolve(category: string | undefined): string {
  return categoryIcons[category ?? ""] ?? vaultSvgIcons.login
}
