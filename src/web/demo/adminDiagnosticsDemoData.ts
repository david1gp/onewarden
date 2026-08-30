import type { AdminDiagnostics } from "../admin/adminDiagnosticsSchema.js"

export const adminDiagnosticsDemoData: AdminDiagnostics = {
  version: "1.34.1",
  environment: "self-hosted",
  checkedAt: "2026-08-30T12:00:00Z",
  configuration: {
    configOverrides: ["DOMAIN", "IP_HEADER", "SMTP_HOST"],
    templateOverrides: ["admin", "email"],
  },
  invalidFeatureFlags: ["legacy_client_sync", "future_preview"],
  checks: [
    {
      id: "versions",
      label: "Versions",
      status: "warning",
      summary: "The server is current; a web-vault update is available.",
      items: [
        { label: "Server Installed", value: "1.34.1", status: "healthy" },
        { label: "Server Latest", value: "1.34.1", status: "healthy" },
        { label: "Web Installed", value: "2025.8.0", status: "warning" },
        { label: "Web Latest", value: "2025.9.0", status: "warning" },
      ],
    },
    {
      id: "database",
      label: "Database",
      status: "healthy",
      summary: "SQLite connection is healthy.",
      detail: "Last query completed in 4 ms.",
      items: [
        { label: "Database", value: "SQLite" },
        { label: "Database version", value: "3.45.3" },
      ],
    },
    {
      id: "host",
      label: "OS/Arch",
      status: "healthy",
      summary: "The server runtime is reporting its host platform.",
      items: [
        { label: "OS", value: "Linux" },
        { label: "Architecture", value: "x86_64" },
      ],
    },
    {
      id: "container",
      label: "Running within a container",
      status: "healthy",
      summary: "The server is running inside a container image.",
      items: [
        { label: "Running within a container", value: "Yes" },
        { label: "Base image", value: "vaultwarden/server:1.34.1-alpine" },
      ],
    },
    {
      id: "configuration",
      label: "Configuration overrides",
      status: "warning",
      summary: "Environment values are overridden by config.json and custom templates.",
      items: [
        { label: "Uses config.json", value: "Yes" },
        { label: "Config overrides", value: "DOMAIN, IP_HEADER, SMTP_HOST" },
        { label: "Uses custom templates", value: "Yes" },
        { label: "Template overrides", value: "admin, email" },
      ],
    },
    {
      id: "reverse-proxy",
      label: "Reverse proxy and IP header",
      status: "healthy",
      summary: "The reverse proxy is forwarding the configured client IP header.",
      items: [
        { label: "Uses a reverse proxy", value: "Yes" },
        { label: "IP header check", value: "Match", status: "healthy" },
        { label: "Config/Server", value: "X-Real-IP" },
      ],
    },
    {
      id: "internet",
      label: "Internet and proxy access",
      status: "healthy",
      summary: "Outbound internet access is available without a proxy.",
      items: [
        { label: "Internet access", value: "Yes", status: "healthy" },
        { label: "Internet access via a proxy", value: "No" },
      ],
    },
    {
      id: "websocket",
      label: "Websocket enabled",
      status: "healthy",
      summary: "Websocket connections are enabled and working.",
      items: [
        { label: "Websocket enabled", value: "Yes" },
        { label: "Websocket connection", value: "Working", status: "healthy" },
      ],
    },
    {
      id: "dns",
      label: "DNS (github.com)",
      status: "healthy",
      summary: "DNS resolution is working.",
      items: [
        { label: "Resolved address", value: "140.82.112.3" },
        { label: "DNS check", value: "Ok", status: "healthy" },
      ],
    },
    {
      id: "time",
      label: "Date & Time",
      status: "healthy",
      summary: "Browser, server, and NTP clocks are within the 15 second tolerance.",
      items: [
        { label: "Date & Time (Local)", value: "Server: 2026-08-30 12:00:00 UTC" },
        {
          label: "Date & Time (UTC)",
          value: "NTP: 2026-08-30 12:00:01 UTC · Server: 2026-08-30 12:00:00 UTC · Browser: 2026-08-30 12:00:02 UTC",
        },
        { label: "Browser/Server Time Check", value: "Ok (2 seconds drift)", status: "healthy" },
        { label: "Server/NTP Time Check", value: "Ok (1 second drift)", status: "healthy" },
        { label: "Browser/NTP Time Check", value: "Ok (1 second drift)", status: "healthy" },
      ],
    },
    {
      id: "domain",
      label: "Domain configuration",
      status: "healthy",
      summary: "The configured domain matches the browser URL and uses HTTPS.",
      items: [
        { label: "Server", value: "https://vault.demo.internal/admin/diagnostics" },
        { label: "Browser", value: "https://vault.demo.internal/admin/diagnostics" },
        { label: "Domain configuration", value: "Match", status: "healthy" },
        { label: "HTTPS", value: "Configured", status: "healthy" },
      ],
    },
    {
      id: "http-response",
      label: "HTTP Response validation",
      status: "healthy",
      summary: "HTTP responses and security headers match the expected values.",
      items: [
        { label: "HTTP response", value: "All test responses valid", status: "healthy" },
        {
          label: "Security headers",
          value: "7 expected headers present",
          status: "healthy",
        },
        {
          label: "Validated headers",
          value:
            "x-frame-options, x-content-type-options, referrer-policy, x-xss-protection, x-robots-tag, cross-origin-resource-policy, content-security-policy",
        },
        { label: "HTTP error responses", value: "400, 401, 403, and 404 valid", status: "healthy" },
      ],
    },
    {
      id: "feature-flags",
      label: "Invalid Feature Flags",
      status: "warning",
      summary: "Some configured client feature flags are invalid or outdated.",
      items: [
        { label: "Flags", value: "legacy_client_sync, future_preview", status: "warning" },
        { label: "Invalid feature flags", value: "2 flags require review", status: "warning" },
      ],
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
