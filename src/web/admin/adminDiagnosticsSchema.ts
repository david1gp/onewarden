import * as v from "valibot"

const adminDiagnosticCheckSchema = v.object({
  id: v.string(),
  label: v.string(),
  status: v.picklist(["healthy", "warning", "disabled"]),
  summary: v.string(),
  detail: v.optional(v.string()),
})

export const adminDiagnosticsSchema = v.object({
  version: v.string(),
  environment: v.string(),
  checkedAt: v.string(),
  checks: v.array(adminDiagnosticCheckSchema),
})

export type AdminDiagnostics = v.InferOutput<typeof adminDiagnosticsSchema>
