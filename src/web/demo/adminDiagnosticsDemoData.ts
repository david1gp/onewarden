import type { AdminDiagnostics } from "../admin/adminDiagnosticsSchema.js"

export const adminDiagnosticsDemoData: AdminDiagnostics = {
  version: "1.0.0-demo",
  environment: "self-hosted",
  checkedAt: "2026-08-29T09:00:00Z",
  checks: [
    {
      id: "database",
      label: "Database",
      status: "healthy",
      summary: "SQLite connection is healthy.",
      detail: "Last query completed in 4 ms.",
    },
    {
      id: "mail",
      label: "Mail delivery",
      status: "warning",
      summary: "SMTP is configured but has not been tested recently.",
      detail: "Send a test message to verify delivery.",
    },
    {
      id: "sso",
      label: "Single sign-on",
      status: "disabled",
      summary: "SSO is disabled for this server.",
    },
    {
      id: "storage",
      label: "Storage",
      status: "healthy",
      summary: "Local storage is available.",
      detail: "82% of the configured storage budget remains.",
    },
  ],
}
