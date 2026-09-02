import * as v from "valibot"
import { extensionStorageSchemaVersion } from "./extensionStorageSchemaVersion.js"

const authTokenSchema = v.pipe(v.string(), v.minLength(1))

const extensionAuthSessionStorageDataSchema = v.strictObject({
  accessToken: authTokenSchema,
  refreshToken: authTokenSchema,
  expiresAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
  tokenType: v.literal("Bearer"),
  scope: v.string(),
  accountId: v.nullable(v.string()),
  email: v.nullable(v.string()),
  encryptedPrivateKey: v.optional(v.nullable(v.string())),
})

export const extensionAuthSessionStorageSchema = v.strictObject({
  schemaVersion: v.literal(extensionStorageSchemaVersion),
  ...extensionAuthSessionStorageDataSchema.entries,
})

export type ExtensionAuthSession = v.InferOutput<typeof extensionAuthSessionStorageDataSchema>
