import type { CipherCategory } from "../schemas/cipherCategorySchema.js"
import type { CipherType } from "../schemas/cipherTypeSchema.js"
import { cipherTypeToCategory } from "./cipherTypeToCategory.js"

export function cipherCategoryLabelResolve(categoryOrType: CipherCategory | CipherType | string): string {
  const category = typeof categoryOrType === "number" ? cipherTypeToCategory(categoryOrType) : categoryOrType

  switch (category) {
    case "login":
    case "1":
      return "Login"
    case "secureNote":
    case "2":
      return "Secure Note"
    case "creditCard":
    case "card":
    case "3":
      return "Credit Card"
    case "identity":
    case "4":
      return "Identity"
    case "password":
      return "Password"
    case "server":
      return "Server"
    case "sshKey":
    case "5":
      return "SSH Key"
    default:
      return "Login"
  }
}
