import * as v from "valibot"
import { createResult, createResultError, type Result } from "#result"
import { type OneWardenConfiguration, oneWardenConfigurationSchema } from "./oneWardenConfigurationSchema.js"

const defaultConfiguration = {
  databasePath: "onewarden.sqlite",
  disableUserRegistration: false,
  domain: "http://localhost",
  experimentalClientFeatureFlags: "",
  suppressOnboardingInterstitials: false,
} as const

type ConfigurationInput = Readonly<Record<string, unknown>>

export function oneWardenConfigurationParse(input: unknown = process.env): Result<OneWardenConfiguration> {
  const op = "oneWardenConfigurationParse"
  if (!isRecord(input)) return createResultError(op, "OneWarden configuration must be an object.")

  const databasePath =
    configurationValueGet(input, [
      "databasePath",
      "ONEWARDEN_DATABASE_PATH",
      "DATABASE_PATH",
      "ONEWARDEN_DATABASE_URL",
      "DATABASE_URL",
    ]) ?? defaultConfiguration.databasePath
  const domain = configurationValueGet(input, ["domain", "ONEWARDEN_DOMAIN", "DOMAIN"]) ?? defaultConfiguration.domain
  const disableUserRegistration = configurationBooleanGet(input, [
    "disableUserRegistration",
    "ONEWARDEN_DISABLE_USER_REGISTRATION",
    "DISABLE_USER_REGISTRATION",
  ])
  if (!disableUserRegistration.success) return disableUserRegistration

  const signupAllowed = configurationBooleanGet(input, [
    "signupAllowed",
    "ONEWARDEN_SIGNUPS_ALLOWED",
    "SIGNUPS_ALLOWED",
  ])
  if (!signupAllowed.success) return signupAllowed

  const suppressOnboardingInterstitials = configurationBooleanGet(input, [
    "suppressOnboardingInterstitials",
    "ONEWARDEN_SUPPRESS_ONBOARDING_INTERSTITIALS",
    "ONEWARDEN_CLIENT_SUPPRESS_ONBOARDING",
    "CLIENT_SUPPRESS_ONBOARDING",
  ])
  if (!suppressOnboardingInterstitials.success) return suppressOnboardingInterstitials

  const parsed = v.safeParse(oneWardenConfigurationSchema, {
    databasePath,
    disableUserRegistration:
      disableUserRegistration.data ?? (signupAllowed.data === undefined ? false : !signupAllowed.data),
    domain,
    experimentalClientFeatureFlags:
      configurationValueGet(input, [
        "experimentalClientFeatureFlags",
        "ONEWARDEN_EXPERIMENTAL_CLIENT_FEATURE_FLAGS",
        "EXPERIMENTAL_CLIENT_FEATURE_FLAGS",
      ]) ?? defaultConfiguration.experimentalClientFeatureFlags,
    suppressOnboardingInterstitials: suppressOnboardingInterstitials.data ?? false,
  })
  if (!parsed.success) {
    const fields = parsed.issues
      .map((issue) => issue.path?.at(-1)?.key)
      .filter((field): field is string => typeof field === "string")
    const fieldSuffix = fields.length > 0 ? ` Invalid fields: ${[...new Set(fields)].join(", ")}.` : ""
    return createResultError(op, `OneWarden configuration is invalid.${fieldSuffix}`)
  }

  const normalizedDomain = oneWardenDomainNormalize(parsed.output.domain)
  if (!normalizedDomain.success) return normalizedDomain

  return createResult({ ...parsed.output, domain: normalizedDomain.data })
}

function configurationBooleanGet(input: ConfigurationInput, keys: string[]): Result<boolean | undefined> {
  const value = configurationValueGet(input, keys)
  if (value === undefined) return createResult(undefined)
  if (typeof value === "boolean") return createResult(value)
  if (typeof value !== "string")
    return createResultError("oneWardenConfigurationParse", `Configuration value must be a boolean: ${keys[0]}.`)

  const normalized = value.trim().toLowerCase()
  if (normalized === "true" || normalized === "1") return createResult(true)
  if (normalized === "false" || normalized === "0") return createResult(false)
  return createResultError("oneWardenConfigurationParse", `Configuration value must be a boolean: ${keys[0]}.`)
}

function configurationValueGet(input: ConfigurationInput, keys: string[]): unknown {
  for (const key of keys) {
    if (input[key] !== undefined) return input[key]
  }
  return undefined
}

function oneWardenDomainNormalize(value: string): Result<string> {
  const op = "oneWardenConfigurationParse"
  const url = new URL(value)
  const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "")
  if (pathname.includes(".."))
    return createResultError(op, "OneWarden configuration is invalid. Invalid fields: domain.")
  return createResult(`${url.origin}${pathname}`)
}

function isRecord(input: unknown): input is ConfigurationInput {
  return typeof input === "object" && input !== null && !Array.isArray(input)
}
