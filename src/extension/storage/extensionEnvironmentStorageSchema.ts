import * as v from "valibot"
import { extensionEnvironmentSourceSchema } from "../api/extensionEnvironmentSourceSchema.js"
import { extensionStorageSchemaVersion } from "./extensionStorageSchemaVersion.js"

const extensionEnvironmentStorageDataSchema = v.strictObject({
  source: extensionEnvironmentSourceSchema,
})

export const extensionEnvironmentStorageSchema = v.strictObject({
  schemaVersion: v.literal(extensionStorageSchemaVersion),
  ...extensionEnvironmentStorageDataSchema.entries,
})

export type ExtensionEnvironmentStorage = v.InferOutput<typeof extensionEnvironmentStorageDataSchema>
