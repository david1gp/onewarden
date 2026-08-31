import * as v from "valibot"
import { extensionFullWindowPane } from "../fullwindow/ExtensionFullWindowPane.js"
import { extensionLoginFillRequestSchema } from "../fill/extensionLoginFillRequestSchema.js"
import { extensionPasskeyAssertionRequestSchema } from "../passkey/extensionPasskeyAssertionRequestSchema.js"
import { extensionPasskeyCredentialCreateRequestSchema } from "../passkey/extensionPasskeyCredentialCreateRequestSchema.js"
import { extensionLockPolicyRequestSchema } from "../storage/extensionLockPolicyRequestSchema.js"

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
  v.strictObject({ type: v.literal("lockPolicyLoad") }),
  v.strictObject({ type: v.literal("lockPolicySave"), request: extensionLockPolicyRequestSchema }),
  v.strictObject({ type: v.literal("lock") }),
  v.strictObject({ type: v.literal("logout") }),
  v.strictObject({ type: v.literal("activeTabContextLookup") }),
  v.strictObject({ type: v.literal("loginFill"), request: extensionLoginFillRequestSchema }),
  v.strictObject({
    type: v.literal("totpCopy"),
    request: v.strictObject({ loginId: v.pipe(v.string(), v.minLength(1)) }),
  }),
  v.strictObject({
    type: v.literal("fullWindowOpen"),
    pane: v.optional(v.picklist(Object.values(extensionFullWindowPane))),
  }),
  v.strictObject({ type: v.literal("passkeyConsentContext"), request: v.unknown() }),
  v.strictObject({
    type: v.literal("passkeyCredentialCreate"),
    request: extensionPasskeyCredentialCreateRequestSchema,
  }),
  v.strictObject({ type: v.literal("passkeyAssertion"), request: extensionPasskeyAssertionRequestSchema }),
  v.strictObject({
    type: v.literal("passkeyConsentUiLoad"),
    request: v.strictObject({ requestId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)) }),
  }),
  v.strictObject({
    type: v.literal("passkeyConsentUiVerify"),
    request: v.strictObject({
      requestId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
      password: v.pipe(v.string(), v.minLength(1), v.maxLength(1_000)),
    }),
  }),
  v.strictObject({
    type: v.literal("passkeyConsentUiApprove"),
    request: v.strictObject({
      requestId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
      cipherId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
      credentialId: v.nullable(v.pipe(v.string(), v.minLength(1), v.maxLength(256))),
      revisionDate: v.string(),
    }),
  }),
  v.strictObject({
    type: v.literal("passkeyConsentUiCancel"),
    request: v.strictObject({ requestId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)) }),
  }),
])

export const extensionRuntimeMessageSchema = extensionRuntimeMessageSchemaData

export type ExtensionRuntimeMessage = v.InferOutput<typeof extensionRuntimeMessageSchema>
