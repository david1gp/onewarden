import * as v from "valibot"

export const twoFactorDeviceSettingsSchema = v.object({
  isDeviceVerificationSectionEnabled: v.boolean(),
  unknownDeviceVerificationEnabled: v.boolean(),
  object: v.literal("deviceVerificationSettings"),
})

export type TwoFactorDeviceSettings = v.InferOutput<typeof twoFactorDeviceSettingsSchema>
