import * as v from "valibot"
import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { identityClientIpTrustedProxyParse } from "../contexts/identity/identityClientIpTrustedProxyParse.js"
import { type ServerConfig, serverConfigSchema } from "./serverConfigSchema.js"

export function serverConfigLoad(source: Readonly<Record<string, string | undefined>> = Bun.env): Result<ServerConfig> {
  const op = "serverConfigLoad"
  const result = v.safeParse(serverConfigSchema, source)
  if (!result.success) return resultErrorCreate(op, serverConfigIssuesSummarize(result.issues))
  const invalidTrustedProxy = serverConfigTrustedProxyInvalidEntry(result.output.IP_HEADER_TRUSTED_PROXIES)
  if (invalidTrustedProxy !== undefined)
    return resultErrorCreate(op, "IP_HEADER_TRUSTED_PROXIES contains an invalid IP or CIDR range.")
  const isProduction = source.NODE_ENV?.trim().toLowerCase() === "production"
  if (isProduction && result.output.PUBLIC_ORIGIN === undefined)
    return resultErrorCreate(op, "PUBLIC_ORIGIN is required in production.")
  const mailEnabled = source.MAIL_ENABLED?.trim().toLowerCase() === "true"
  if (mailEnabled) {
    if (result.output.PUBLIC_ORIGIN === undefined) return resultErrorCreate(op, "MAIL_ENABLED requires PUBLIC_ORIGIN.")
    const missingMailSettings = serverConfigMailMissingSettings(result.output)
    if (missingMailSettings.length > 0)
      return resultErrorCreate(op, `MAIL_ENABLED requires ${missingMailSettings.join(", ")}.`)
  }
  if (isProduction && result.output.PUBLIC_ORIGIN !== undefined) {
    if (new URL(result.output.PUBLIC_ORIGIN).protocol !== "https:")
      return resultErrorCreate(op, "PUBLIC_ORIGIN must use HTTPS in production.")
  }
  const smtpUsernameConfigured = result.output.SMTP_USERNAME !== undefined && result.output.SMTP_USERNAME.length > 0
  const smtpPasswordConfigured = result.output.SMTP_PASSWORD !== undefined && result.output.SMTP_PASSWORD.length > 0
  if (smtpUsernameConfigured !== smtpPasswordConfigured)
    return resultErrorCreate(op, "SMTP_USERNAME and SMTP_PASSWORD must be set together.")
  if (result.output.PUSH_ENABLED) {
    if (result.output.PUSH_INSTALLATION_ID === "" || result.output.PUSH_INSTALLATION_KEY === "")
      return resultErrorCreate(op, "Push notifications require PUSH_INSTALLATION_ID and PUSH_INSTALLATION_KEY.")
    for (const [name, value] of [
      ["PUSH_RELAY_URI", result.output.PUSH_RELAY_URI],
      ["PUSH_IDENTITY_URI", result.output.PUSH_IDENTITY_URI],
    ] as const) {
      const urlResult = v.safeParse(v.pipe(v.string(), v.url()), value)
      if (!urlResult.success) return resultErrorCreate(op, `${name} must be a valid URL.`)
      if (new URL(value).protocol !== "https:") return resultErrorCreate(op, `${name} must start with https://.`)
    }
  }
  return resultCreate(result.output)
}

function serverConfigTrustedProxyInvalidEntry(value: string): string | undefined {
  const normalized = value.trim()
  if (normalized.length === 0 || normalized.toLowerCase() === "all" || normalized.toLowerCase() === "local")
    return undefined
  for (const entry of normalized.split(",").filter((item) => item.trim().length > 0)) {
    if (identityClientIpTrustedProxyParse(entry) === undefined) return entry.trim()
  }
  return undefined
}

function serverConfigMailMissingSettings(config: ServerConfig): string[] {
  const missing: string[] = []
  if (config.SMTP_HOST === undefined) missing.push("SMTP_HOST")
  if (config.SMTP_FROM === undefined) missing.push("SMTP_FROM")
  if (config.SMTP_USERNAME === undefined || config.SMTP_USERNAME.length === 0) missing.push("SMTP_USERNAME")
  if (config.SMTP_PASSWORD === undefined || config.SMTP_PASSWORD.length === 0) missing.push("SMTP_PASSWORD")
  return missing
}

function serverConfigIssuesSummarize(issues: readonly v.BaseIssue<unknown>[]): string {
  return issues
    .map((issue) => {
      const path = issue.path?.map((item) => String(item.key)).join(".") || "configuration"
      const message = issue.message.split(": Received", 1)[0]
      return `${path}: ${message}`
    })
    .join("; ")
}
