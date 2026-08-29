import * as v from "valibot"

export const cipherCategorySchema = v.picklist([
  "login",
  "secureNote",
  "creditCard",
  "identity",
  "password",
  "server",
  "sshKey",
])

export type CipherCategory = v.InferOutput<typeof cipherCategorySchema>
