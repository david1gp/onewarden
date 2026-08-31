import * as v from "valibot"
import { extensionLoginFillRequestSchema } from "../fill/extensionLoginFillRequestSchema.js"
import { extensionPasskeyAssertionRequestSchema } from "../passkey/extensionPasskeyAssertionRequestSchema.js"
import { extensionPasskeyCredentialCreateRequestSchema } from "../passkey/extensionPasskeyCredentialCreateRequestSchema.js"

const extensionRuntimeSurfaceSchema = v.picklist(["popup", "fullwindow"])

const extensionRuntimeMessageSchemaData = v.variant("type", [
  v.strictObject({ type: v.literal("initialize") }),
  v.strictObject({ type: v.literal("login"), request: v.unknown() }),
  v.strictObject({ type: v.literal("unlock"), request: v.unknown() }),
  v.strictObject({
    type: v.literal("viewModelLoad"),
    surface: v.optional(extensionRuntimeSurfaceSchema, "popup"),
  }),
  v.strictObject({ type: v.literal("conditionalSync") }),
  v.strictObject({ type: v.literal("manualSync") }),
  v.strictObject({
    type: v.literal("sessionHandoffOpen"),
    request: v.variant("operation", [
      v.strictObject({ operation: v.literal("create"), cipherId: v.null() }),
      v.strictObject({
        operation: v.literal("edit"),
        cipherId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
      }),
    ]),
  }),
  v.strictObject({ type: v.literal("environmentSave"), request: v.unknown() }),
  v.strictObject({ type: v.literal("lock") }),
  v.strictObject({ type: v.literal("logout") }),
  v.strictObject({ type: v.literal("activeTabContextLookup") }),
  v.strictObject({ type: v.literal("loginFill"), request: extensionLoginFillRequestSchema }),
  v.strictObject({
    type: v.literal("totpCopy"),
    request: v.strictObject({ loginId: v.pipe(v.string(), v.minLength(1)) }),
  }),
  v.strictObject({ type: v.literal("fullWindowOpen") }),
  v.strictObject({ type: v.literal("passkeyConsentContext"), request: v.unknown() }),
  v.strictObject({
    type: v.literal("passkeyCredentialCreate"),
    request: extensionPasskeyCredentialCreateRequestSchema,
  }),
  v.strictObject({ type: v.literal("passkeyAssertion"), request: extensionPasskeyAssertionRequestSchema }),
])

export const extensionRuntimeMessageSchema = extensionRuntimeMessageSchemaData

export type ExtensionRuntimeMessage = v.InferOutput<typeof extensionRuntimeMessageSchema>
