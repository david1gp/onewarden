import * as v from "valibot"
import { extensionStorageSchemaVersion } from "./extensionStorageSchemaVersion.js"

const extensionLockPolicyDataSchema = v.strictObject({
  action: v.picklist(["lock", "logout"]),
  timeoutMinutes: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1))),
})

export const extensionLockPolicySchema = v.strictObject({
  schemaVersion: v.literal(extensionStorageSchemaVersion),
  ...extensionLockPolicyDataSchema.entries,
})

export type ExtensionLockPolicy = v.InferOutput<typeof extensionLockPolicyDataSchema>
