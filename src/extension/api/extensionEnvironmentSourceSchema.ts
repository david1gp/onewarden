import * as v from "valibot"

const extensionEnvironmentLocationSchema = v.pipe(v.string(), v.url())

export const extensionEnvironmentSourceSchema = v.union([
  v.picklist(["us", "eu"]),
  extensionEnvironmentLocationSchema,
  v.looseObject({
    region: v.optional(v.picklist(["us", "eu"])),
    base: v.optional(extensionEnvironmentLocationSchema),
    baseUrl: v.optional(extensionEnvironmentLocationSchema),
    api: v.optional(extensionEnvironmentLocationSchema),
    apiUrl: v.optional(extensionEnvironmentLocationSchema),
    identity: v.optional(extensionEnvironmentLocationSchema),
    identityUrl: v.optional(extensionEnvironmentLocationSchema),
    icons: v.optional(extensionEnvironmentLocationSchema),
    iconsUrl: v.optional(extensionEnvironmentLocationSchema),
    notifications: v.optional(extensionEnvironmentLocationSchema),
    notificationsUrl: v.optional(extensionEnvironmentLocationSchema),
    events: v.optional(extensionEnvironmentLocationSchema),
    eventsUrl: v.optional(extensionEnvironmentLocationSchema),
    webVault: v.optional(extensionEnvironmentLocationSchema),
    webVaultUrl: v.optional(extensionEnvironmentLocationSchema),
  }),
])

export type ExtensionEnvironmentSource = v.InferInput<typeof extensionEnvironmentSourceSchema>
