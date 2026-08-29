import type { CipherCategory } from "../schemas/cipherCategorySchema.js"
import type { CipherType } from "../schemas/cipherTypeSchema.js"

export function cipherCategoryToType(category: CipherCategory | string): CipherType {
  switch (category) {
    case "login":
      return 1
    case "secureNote":
      return 2
    case "creditCard":
    case "card":
      return 3
    case "identity":
      return 4
    case "sshKey":
      return 5
    default:
      return 1
  }
}
