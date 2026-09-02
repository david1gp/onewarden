import * as v from "valibot"

export const extensionBiometricCapabilitySchema = v.union([
  v.strictObject({
    status: v.literal("available"),
    platformAuthenticator: v.literal(true),
    prf: v.literal(true),
  }),
  v.strictObject({
    status: v.literal("unsupported"),
  }),
  v.strictObject({
    status: v.literal("unavailable"),
  }),
])

export type ExtensionBiometricCapability = v.InferOutput<typeof extensionBiometricCapabilitySchema>
