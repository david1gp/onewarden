import * as v from "valibot"

export const adminDiagnosticsSchema = v.object({
  current_release: v.optional(v.string()),
  db_type: v.optional(v.string()),
  db_version: v.optional(v.nullable(v.union([v.number(), v.string()]))),
  server_time: v.optional(v.string()),
  web_vault_enabled: v.optional(v.boolean()),
  dns_resolved: v.optional(v.union([v.boolean(), v.string()])),
  has_http_access: v.optional(v.boolean()),
  ip_header_exists: v.optional(v.boolean()),
  ip_header_match: v.optional(v.boolean()),
  ip_header_name: v.optional(v.string()),
  running_within_container: v.optional(v.boolean()),
  uses_proxy: v.optional(v.boolean()),
  overrides: v.optional(v.array(v.string())),
})

export type AdminDiagnostics = v.InferOutput<typeof adminDiagnosticsSchema>
