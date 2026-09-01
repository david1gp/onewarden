import * as v from "valibot"
import { extensionAutofillFieldDescriptorSchema } from "./extensionAutofillFieldDescriptorSchema.js"

const documentIdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(128))
const fieldIdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(160))
const requestIdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(128))
const revisionSchema = v.pipe(v.number(), v.integer(), v.minValue(0))

export const extensionAutofillContentMessageSchema = v.variant("type", [
  v.strictObject({
    type: v.literal("autofill.pageLoadFilled"),
    documentId: documentIdSchema,
    revision: revisionSchema,
    formId: fieldIdSchema,
    requestId: requestIdSchema,
    filledCount: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100)),
  }),
  v.strictObject({
    type: v.literal("autofill.ready"),
    documentId: documentIdSchema,
    revision: revisionSchema,
  }),
  v.strictObject({
    type: v.literal("autofill.fieldsChanged"),
    documentId: documentIdSchema,
    revision: revisionSchema,
    url: v.pipe(v.string(), v.minLength(1), v.maxLength(4_096)),
    fields: v.pipe(v.array(extensionAutofillFieldDescriptorSchema), v.maxLength(1_000)),
  }),
  v.strictObject({
    type: v.literal("autofill.navigation"),
    documentId: documentIdSchema,
    revision: revisionSchema,
  }),
  v.strictObject({
    type: v.literal("autofill.menuDismissed"),
    documentId: documentIdSchema,
    fieldId: fieldIdSchema,
    reason: v.picklist(["blur", "escape", "navigation", "removed", "stopped"]),
  }),
  v.strictObject({
    type: v.literal("autofill.candidatesRequest"),
    documentId: documentIdSchema,
    revision: revisionSchema,
    fieldId: fieldIdSchema,
    requestId: requestIdSchema,
    url: v.pipe(v.string(), v.minLength(1), v.maxLength(4_096)),
  }),
  v.strictObject({
    type: v.literal("autofill.candidateSelected"),
    documentId: documentIdSchema,
    revision: revisionSchema,
    fieldId: fieldIdSchema,
    requestId: requestIdSchema,
    candidateId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
    candidateType: v.picklist([1, 3, 4]),
  }),
  v.strictObject({
    type: v.literal("autofill.credentialCapture"),
    documentId: documentIdSchema,
    revision: revisionSchema,
    formId: fieldIdSchema,
    requestId: requestIdSchema,
    url: v.pipe(v.string(), v.minLength(1), v.maxLength(4_096)),
    actionUrl: v.pipe(v.string(), v.minLength(1), v.maxLength(4_096)),
    method: v.picklist(["POST", "PUT", "PATCH"]),
    cause: v.picklist(["submit", "programmaticSubmit", "network"]),
    username: v.nullable(v.pipe(v.string(), v.maxLength(320))),
    password: v.pipe(v.string(), v.minLength(1), v.maxLength(4_096)),
  }),
  v.strictObject({
    type: v.literal("autofill.credentialPromptDecision"),
    documentId: documentIdSchema,
    revision: revisionSchema,
    requestId: requestIdSchema,
    promptId: requestIdSchema,
    decision: v.picklist(["accept", "dismiss", "neverSite", "expire"]),
    totp: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(2_048))), null),
  }),
])

export type ExtensionAutofillContentMessage = v.InferOutput<typeof extensionAutofillContentMessageSchema>
