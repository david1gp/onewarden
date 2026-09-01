import * as v from "valibot"
import { extensionAutofillCandidateSchema } from "./extensionAutofillCandidateSchema.js"
import { extensionAutofillFillValueSchema } from "./extensionAutofillFillValueSchema.js"
import { extensionCredentialCapturePromptSchema } from "./extensionCredentialCapturePromptSchema.js"

const documentIdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(128))
const fieldIdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(160))
const requestIdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(128))
const revisionSchema = v.pipe(v.number(), v.integer(), v.minValue(0))

export const extensionAutofillBackgroundMessageSchema = v.variant("type", [
  v.strictObject({ type: v.literal("autofill.start"), documentId: documentIdSchema }),
  v.strictObject({
    type: v.literal("autofill.pageLoadFill"),
    documentId: documentIdSchema,
    revision: revisionSchema,
    fieldId: fieldIdSchema,
    formId: fieldIdSchema,
    requestId: requestIdSchema,
    candidateType: v.literal(1),
    values: v.pipe(v.array(extensionAutofillFillValueSchema), v.maxLength(40)),
  }),
  v.strictObject({
    type: v.literal("autofill.stop"),
    documentId: documentIdSchema,
    reason: v.picklist(["background", "locked", "logout", "accountChanged"]),
  }),
  v.strictObject({ type: v.literal("autofill.scanNow"), documentId: documentIdSchema }),
  v.strictObject({
    type: v.literal("autofill.candidates"),
    documentId: documentIdSchema,
    revision: revisionSchema,
    fieldId: fieldIdSchema,
    requestId: requestIdSchema,
    status: v.picklist(["ready", "locked", "unavailable"]),
    candidates: v.pipe(v.array(extensionAutofillCandidateSchema), v.maxLength(500)),
  }),
  v.strictObject({
    type: v.literal("autofill.fill"),
    documentId: documentIdSchema,
    revision: revisionSchema,
    fieldId: fieldIdSchema,
    requestId: requestIdSchema,
    candidateType: v.picklist([1, 3, 4]),
    values: v.pipe(v.array(extensionAutofillFillValueSchema), v.maxLength(40)),
  }),
  v.strictObject({
    type: v.literal("autofill.fillRejected"),
    documentId: documentIdSchema,
    revision: revisionSchema,
    fieldId: fieldIdSchema,
    requestId: requestIdSchema,
    reason: v.picklist(["locked", "permission", "stale", "unavailable"]),
  }),
  v.strictObject({
    type: v.literal("autofill.credentialPrompt"),
    documentId: documentIdSchema,
    revision: revisionSchema,
    requestId: requestIdSchema,
    prompt: extensionCredentialCapturePromptSchema,
  }),
  v.strictObject({
    type: v.literal("autofill.credentialOutcome"),
    documentId: documentIdSchema,
    revision: revisionSchema,
    requestId: requestIdSchema,
    promptId: requestIdSchema,
    status: v.picklist(["saved", "updated", "dismissed", "suppressed", "expired", "stale", "locked", "unavailable"]),
  }),
])

export type ExtensionAutofillBackgroundMessage = v.InferOutput<typeof extensionAutofillBackgroundMessageSchema>
