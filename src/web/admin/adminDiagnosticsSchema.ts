import * as v from "valibot"

const adminDiagnosticStatusSchema = v.picklist(["healthy", "warning", "disabled", "error"])

const adminDiagnosticItemSchema = v.object({
  label: v.string(),
  value: v.string(),
  status: v.optional(adminDiagnosticStatusSchema),
})

const adminDiagnosticCheckSchema = v.object({
  id: v.string(),
  label: v.string(),
  status: adminDiagnosticStatusSchema,
  summary: v.string(),
  detail: v.optional(v.string()),
  items: v.optional(v.array(adminDiagnosticItemSchema)),
})

export const adminDiagnosticsSchema = v.object({
  version: v.string(),
  environment: v.string(),
  checkedAt: v.string(),
  configuration: v.object({
    configOverrides: v.array(v.string()),
    templateOverrides: v.array(v.string()),
  }),
  invalidFeatureFlags: v.array(v.string()),
  checks: v.array(adminDiagnosticCheckSchema),
})

export type AdminDiagnostics = v.InferOutput<typeof adminDiagnosticsSchema>
