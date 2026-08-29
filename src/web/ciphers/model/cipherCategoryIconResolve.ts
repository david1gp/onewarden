import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import type { CipherCategory } from "../schemas/cipherCategorySchema.js"
import type { CipherType } from "../schemas/cipherTypeSchema.js"
import { cipherTypeToCategory } from "./cipherTypeToCategory.js"

export function cipherCategoryIconResolve(categoryOrType: CipherCategory | CipherType | string): string {
  const category = typeof categoryOrType === "number" ? cipherTypeToCategory(categoryOrType) : categoryOrType

  switch (category) {
    case "login":
    case "1":
      return vaultSvgIcons.login
    case "secureNote":
    case "2":
      return vaultSvgIcons.secureNote
    case "creditCard":
    case "card":
    case "3":
      return vaultSvgIcons.creditCard
    case "identity":
    case "4":
      return vaultSvgIcons.identity
    case "server":
      return vaultSvgIcons.server
    case "sshKey":
    case "5":
      return vaultSvgIcons.sshKey
    default:
      return vaultSvgIcons.login
  }
}
