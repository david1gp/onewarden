import * as v from "valibot"
import { extensionStorageSchemaVersion } from "./extensionStorageSchemaVersion.js"

const base64UrlSchema = v.pipe(v.string(), v.minLength(1), v.regex(/^[A-Za-z0-9_-]+$/))

const extensionBiometricEnrollmentDataSchema = v.strictObject({
  userId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  credentialId: v.pipe(base64UrlSchema, v.maxLength(512)),
  rpId: v.pipe(v.string(), v.minLength(1), v.maxLength(253)),
  origin: v.pipe(v.string(), v.minLength(1), v.maxLength(2048)),
  salt: v.pipe(base64UrlSchema, v.maxLength(256)),
  iv: v.pipe(base64UrlSchema, v.maxLength(64)),
  ciphertext: v.pipe(base64UrlSchema, v.maxLength(1024)),
  createdAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
  updatedAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
})

export const extensionBiometricEnrollmentSchema = v.strictObject({
  schemaVersion: v.literal(extensionStorageSchemaVersion),
  ...extensionBiometricEnrollmentDataSchema.entries,
})

export type ExtensionBiometricEnrollment = v.InferOutput<typeof extensionBiometricEnrollmentDataSchema>
