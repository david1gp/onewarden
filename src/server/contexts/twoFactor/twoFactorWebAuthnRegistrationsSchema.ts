import * as v from "valibot"
import { twoFactorWebAuthnCredentialDataSchema } from "./twoFactorWebAuthnCredentialDataSchema.js"

const twoFactorWebAuthnRegistrationIdSchema = v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.maxValue(5))

const twoFactorWebAuthnRegistrationDataSchema = v.pipe(
  v.object({
    credential: v.optional(twoFactorWebAuthnCredentialDataSchema),
    credentialId: v.optional(v.nullable(v.string())),
    id: twoFactorWebAuthnRegistrationIdSchema,
    migrated: v.optional(v.nullable(v.boolean())),
    name: v.string(),
  }),
  v.transform((value) => ({
    credential: value.credential,
    credentialId: value.credential?.id ?? value.credentialId ?? String(value.id),
    id: value.id,
    migrated: value.migrated === true,
    name: value.name,
  })),
  v.check((value) => value.credentialId !== ""),
)

export const twoFactorWebAuthnRegistrationsSchema = v.pipe(
  v.array(twoFactorWebAuthnRegistrationDataSchema),
  v.check((registrations) => {
    const ids = new Set<number>()
    const credentialIds = new Set<string>()
    for (const registration of registrations) {
      if (ids.has(registration.id) || credentialIds.has(registration.credentialId)) return false
      ids.add(registration.id)
      credentialIds.add(registration.credentialId)
    }
    return true
  }),
)

export type TwoFactorWebAuthnRegistrations = v.InferOutput<typeof twoFactorWebAuthnRegistrationsSchema>
