import * as v from "valibot"
import { extensionBiometricCapabilitySchema } from "./extensionBiometricCapabilitySchema.js"

export const extensionBiometricStatusSchema = v.strictObject({
  capability: extensionBiometricCapabilitySchema,
  enrolled: v.boolean(),
})

export type ExtensionBiometricStatus = v.InferOutput<typeof extensionBiometricStatusSchema>
