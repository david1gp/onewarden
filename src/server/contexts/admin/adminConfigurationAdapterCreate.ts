import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { AdminConfig } from "./adminConfigSchema.js"
import type { AdminConfigurationAdapter } from "./adminConfigurationAdapter.js"

export function adminConfigurationAdapterCreate(
  config: AdminConfig,
  identityConfig: IdentityConfig,
): AdminConfigurationAdapter {
  const userConfig: Record<string, unknown> = {}
  const configurable = new Set([...Object.keys(config), ...Object.keys(identityConfig)])
  const initialConfig = { ...config }
  const initialIdentityConfig = { ...identityConfig }

  const initialValueFind = (key: string): unknown => {
    if (key in initialConfig) return initialConfig[key as keyof AdminConfig]
    return initialIdentityConfig[key as keyof IdentityConfig]
  }

  const getPreparedJson = (): unknown => [
    {
      group: "onewarden",
      grouptoggle: "",
      groupdoc: "",
      elements: Object.entries({ ...identityConfig, ...config }).map(([key, value]) => ({
        editable: true,
        name: key,
        value: adminConfigValueMask(key, value),
        default: adminConfigValueMask(key, initialValueFind(key)),
        type: adminConfigTypeResolve(key, value),
        doc: { name: key, description: "" },
        overridden: Object.hasOwn(userConfig, key),
      })),
    },
  ]

  const getSupportJson = (): unknown => {
    const support: Record<string, unknown> = {}
    for (const [key, value] of Object.entries({ ...identityConfig, ...config })) {
      support[key] = adminSupportValueMask(key, value)
    }
    return support
  }

  const update = (data: Record<string, unknown>): Result<void> => {
    for (const [key, value] of Object.entries(data)) {
      if (!configurable.has(key)) continue
      if (key in config) {
        const configKey = key as keyof AdminConfig
        const current = config[configKey]
        if (!adminConfigValueMatches(key, current, value))
          return resultErrorCreate("adminConfigurationUpdate", `Invalid value for ${key}.`, {
            code: "platform.invalid-request",
          })
        ;(config as Record<string, unknown>)[key] = value
      }
      if (key in identityConfig) {
        const configKey = key as keyof IdentityConfig
        const current = identityConfig[configKey]
        if (!adminConfigValueMatches(key, current, value))
          return resultErrorCreate("adminConfigurationUpdate", `Invalid value for ${key}.`, {
            code: "platform.invalid-request",
          })
        ;(identityConfig as Record<string, unknown>)[key] = value
      }
      userConfig[key] = value
    }
    return resultCreate(undefined)
  }

  const remove = (): Result<void> => {
    for (const key of Object.keys(userConfig)) delete userConfig[key]
    Object.assign(config, initialConfig)
    Object.assign(identityConfig, initialIdentityConfig)
    return resultCreate(undefined)
  }

  return { delete: remove, getPreparedJson, getSupportJson, update }
}

function adminConfigValueMask(key: string, value: unknown): unknown {
  if (value === undefined) return null
  return adminConfigSecretKey(key) ? "***" : value
}

function adminSupportValueMask(key: string, value: unknown): unknown {
  const masked = adminConfigValueMask(key, value)
  if (masked !== value || typeof value !== "string") return masked
  if (["SIGNUPS_DOMAINS_WHITELIST", "SSO_CLIENT_ID", "SSO_AUTHORITY"].includes(key)) return adminPrivacyMask(value)
  return value
}

function adminConfigSecretKey(key: string): boolean {
  return key.includes("SECRET") || key.includes("TOKEN") || key.includes("KEY")
}

function adminPrivacyMask(value: string): string {
  let position = 0
  let colonSeen = false
  return [...value]
    .map((character) => {
      position += 1
      if (character === ":" && position <= 11) {
        colonSeen = true
        return character
      }
      if (character === "/" && position <= 13 && colonSeen) return character
      if (character === ",") return character
      return "*"
    })
    .join("")
}

function adminConfigValueMatches(key: string, current: unknown, value: unknown): boolean {
  if (current === undefined) return typeof value === "string"
  if (typeof current === "boolean") return typeof value === "boolean"
  if (typeof current === "number") {
    if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) return false
    const minimum = key === "SIGNUPS_VERIFY_RESEND_TIME" || key === "SIGNUPS_VERIFY_RESEND_LIMIT" ? 0 : 1
    return value >= minimum
  }
  if (typeof current === "string") {
    return typeof value === "string" && (key !== "INVITATION_ORG_NAME" || value.trim().length > 0)
  }
  return false
}

function adminConfigTypeResolve(key: string, value: unknown): "checkbox" | "number" | "password" | "text" {
  if (adminConfigSecretKey(key)) return "password"
  if (typeof value === "boolean") return "checkbox"
  if (typeof value === "number") return "number"
  return "text"
}
