import type { CipherCategory } from "../schemas/cipherCategorySchema.js"
import type { CipherType } from "../schemas/cipherTypeSchema.js"

export function cipherTypeToCategory(type: CipherType): CipherCategory {
  switch (type) {
    case 1:
      return "login"
    case 2:
      return "secureNote"
    case 3:
      return "creditCard"
    case 4:
      return "identity"
    case 5:
      return "sshKey"
    default:
      return "login"
  }
}
