export const webImplementationStatus = [
  { area: "Library entry point", detail: "Publishes package identity only.", state: "available" },
  { area: "CLI entry point", detail: "Stricli application with a status command.", state: "available" },
  { area: "HTTP server", detail: "Hono app serving /alive, /api/alive, and /api/config.", state: "available" },
  { area: "Web UI", detail: "This orientation page, without application screens.", state: "available" },
  { area: "Persistence", detail: "SQLite and Drizzle schemas are not implemented.", state: "planned" },
  { area: "Authentication", detail: "Identity, sessions, and 2FA are not implemented.", state: "planned" },
  { area: "Vault and organizations", detail: "No vault or organization endpoints exist yet.", state: "planned" },
  { area: "Bitwarden compatibility", detail: "No compatibility is claimed or verified today.", state: "planned" },
] as const
