import * as v from "valibot"

export const vaultUrlIdentifierSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(256))

export type VaultUrlIdentifier = v.InferOutput<typeof vaultUrlIdentifierSchema>
