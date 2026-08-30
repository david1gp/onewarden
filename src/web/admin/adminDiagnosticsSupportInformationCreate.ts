import type { AdminDiagnostics } from "./adminDiagnosticsSchema.js"
import type { AdminSettings } from "./adminSettingsSchema.js"

const sensitiveConfigurationKeys = [
  "adminToken",
  "hibpApiKey",
  "ssoClientSecret",
  "smtpPassword",
  "yubicoSecretKey",
  "duoSkey",
] as const

function diagnosticCheckFind(diagnostics: AdminDiagnostics, id: string) {
  return diagnostics.checks.find((check) => check.id === id)
}

function diagnosticValueFind(diagnostics: AdminDiagnostics, id: string, label: string) {
  return diagnosticCheckFind(diagnostics, id)?.items?.find((item) => item.label === label)?.value ?? "Unknown"
}

function diagnosticStatusFormat(diagnostics: AdminDiagnostics, id: string, label?: string) {
  const check = diagnosticCheckFind(diagnostics, id)
  const item = label === undefined ? undefined : check?.items?.find((entry) => entry.label === label)
  const status = item?.status ?? check?.status
  if (status === "disabled") return "disabled"
  return status === "healthy" ? "true :white_check_mark:" : "false :x:"
}

function configurationSafeCreate(settings: AdminSettings) {
  const configuration: Record<string, unknown> = {
    ...settings,
    readOnly: { ...settings.readOnly },
  }

  for (const key of sensitiveConfigurationKeys) {
    configuration[key] = "<redacted>"
  }

  const readOnly = configuration.readOnly
  if (readOnly !== null && typeof readOnly === "object") {
    const readOnlyConfiguration = readOnly as Record<string, unknown>
    readOnlyConfiguration.databaseUrl = "<redacted>"
  }

  return configuration
}

export function adminDiagnosticsSupportInformationCreate(diagnostics: AdminDiagnostics, settings: AdminSettings) {
  const serverInstalled = diagnosticValueFind(diagnostics, "versions", "Server Installed")
  const serverLatest = diagnosticValueFind(diagnostics, "versions", "Server Latest")
  const webInstalled = diagnosticValueFind(diagnostics, "versions", "Web Installed")
  const webLatest = diagnosticValueFind(diagnostics, "versions", "Web Latest")
  const container = diagnosticValueFind(diagnostics, "container", "Running within a container").toLowerCase()
  const baseImage = diagnosticValueFind(diagnostics, "container", "Base image")
  const reverseProxy = diagnosticValueFind(diagnostics, "reverse-proxy", "Uses a reverse proxy").toLowerCase()
  const proxy = diagnosticValueFind(diagnostics, "internet", "Internet access via a proxy").toLowerCase()
  const timezone = diagnosticValueFind(diagnostics, "time", "Date & Time (Local)").replace(/^Server: /, "")
  const configOverrides = diagnostics.configuration.configOverrides.join(", ")
  const templateOverrides = diagnostics.configuration.templateOverrides.join(", ")
  const supportConfiguration = JSON.stringify(configurationSafeCreate(settings), null, 2)

  return [
    "### Your environment (Generated via diagnostics page)",
    "",
    `* Vaultwarden version: v${serverInstalled}`,
    `* Vaultwarden latest: v${serverLatest}`,
    `* Web-vault version: v${webInstalled}`,
    `* Web-vault latest: v${webLatest}`,
    `* OS/Arch: ${diagnosticValueFind(diagnostics, "host", "OS")}/${diagnosticValueFind(diagnostics, "host", "Architecture")}`,
    `* Running within a container: ${container} :heavy_plus_sign: (Base: ${baseImage})`,
    `* Database type: ${diagnosticValueFind(diagnostics, "database", "Database")}`,
    `* Database version: ${diagnosticValueFind(diagnostics, "database", "Database version")}`,
    `* Uses config.json: ${configOverrides.length > 0 ? "yes :heavy_plus_sign:" : "no :heavy_minus_sign:"}`,
    `* Uses custom templates: ${templateOverrides.length > 0 ? "yes :heavy_plus_sign:" : "no :heavy_minus_sign:"}${templateOverrides.length > 0 ? ` (${templateOverrides})` : ""}`,
    `* Uses a reverse proxy: ${reverseProxy} :heavy_plus_sign:`,
    `* IP Header check: ${diagnosticStatusFormat(diagnostics, "reverse-proxy", "IP header check")} (${diagnosticValueFind(diagnostics, "reverse-proxy", "Config/Server")})`,
    `* Internet access: ${diagnosticStatusFormat(diagnostics, "internet", "Internet access")}`,
    `* Internet access via a proxy: ${proxy} :heavy_minus_sign:`,
    `* DNS Check: ${diagnosticStatusFormat(diagnostics, "dns", "DNS check")}`,
    `* Server local time: ${timezone}`,
    `* Browser/Server Time Check: ${diagnosticStatusFormat(diagnostics, "time", "Browser/Server Time Check")}`,
    `* Server/NTP Time Check: ${diagnosticStatusFormat(diagnostics, "time", "Server/NTP Time Check")}`,
    `* Browser/NTP Time Check: ${diagnosticStatusFormat(diagnostics, "time", "Browser/NTP Time Check")}`,
    `* Domain Configuration Check: ${diagnosticStatusFormat(diagnostics, "domain", "Domain configuration")}`,
    `* HTTPS Check: ${diagnosticStatusFormat(diagnostics, "domain", "HTTPS")}`,
    `* Websocket Check: ${diagnosticStatusFormat(diagnostics, "websocket", "Websocket connection")}`,
    `* HTTP Response Checks: ${diagnosticStatusFormat(diagnostics, "http-response", "HTTP response")}`,
    `* Invalid feature flags: ${diagnostics.invalidFeatureFlags.length > 0 ? "true" : "false"}`,
    "",
    "### Config & Details (Generated via diagnostics page)",
    "",
    "<details><summary>Show Config & Details</summary>",
    "",
    ...(configOverrides.length > 0 ? [`**Environment settings which are overridden:** ${configOverrides}`, ""] : []),
    ...(diagnostics.invalidFeatureFlags.length > 0
      ? [`**Invalid feature flags:** ${diagnostics.invalidFeatureFlags.join(", ")}`, ""]
      : []),
    "**Config:**",
    "",
    "```json",
    supportConfiguration,
    "```",
    "",
    "</details>",
  ].join("\n")
}
