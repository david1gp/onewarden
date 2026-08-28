import * as v from "valibot"
import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { type ExtensionEnvironment, extensionEnvironmentSchema } from "./extensionEnvironmentSchema.js"
import {
  type ExtensionEnvironmentSource,
  extensionEnvironmentSourceSchema,
} from "./extensionEnvironmentSourceSchema.js"

const officialEnvironments = {
  us: {
    api: "https://api.bitwarden.com",
    identity: "https://identity.bitwarden.com",
    icons: "https://icons.bitwarden.com",
    notifications: "https://notifications.bitwarden.com",
    events: "https://events.bitwarden.com",
    webVault: "https://vault.bitwarden.com",
  },
  eu: {
    api: "https://api.bitwarden.eu",
    identity: "https://identity.bitwarden.eu",
    icons: "https://icons.bitwarden.eu",
    notifications: "https://notifications.bitwarden.eu",
    events: "https://events.bitwarden.eu",
    webVault: "https://vault.bitwarden.eu",
  },
} as const

const customEnvironmentSuffixes = {
  api: "/api",
  identity: "/identity",
  icons: "/icons",
  notifications: "/notifications",
  events: "/events",
} as const

type EnvironmentOverrides = {
  api?: string
  apiUrl?: string
  base?: string
  baseUrl?: string
  events?: string
  eventsUrl?: string
  icons?: string
  iconsUrl?: string
  identity?: string
  identityUrl?: string
  notifications?: string
  notificationsUrl?: string
  webVault?: string
  webVaultUrl?: string
}

function customLocationCreate(base: string, suffix: string): string {
  return `${base.replace(/\/+$/, "")}${suffix}`
}

function environmentLocationNormalize(location: string): string {
  return location.replace(/\/+$/, "")
}

function environmentOverrideRead(
  overrides: EnvironmentOverrides,
  name: keyof EnvironmentOverrides,
): string | undefined {
  const value = overrides[name]
  if (value !== undefined) return environmentLocationNormalize(value)
  const urlName = `${name}Url` as keyof EnvironmentOverrides
  const urlValue = overrides[urlName]
  return urlValue === undefined ? undefined : environmentLocationNormalize(urlValue)
}

export function extensionEnvironmentResolve(source: ExtensionEnvironmentSource = "us"): Result<ExtensionEnvironment> {
  const op = "extensionEnvironmentResolve"
  const parsed = v.safeParse(extensionEnvironmentSourceSchema, source)
  if (!parsed.success) {
    return resultErrorCreate(op, v.summarize(parsed.issues), {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  if (source === "us" || source === "eu") {
    return extensionEnvironmentValidate(officialEnvironments[source], op)
  }

  if (typeof parsed.output === "string") {
    const customBase = environmentLocationNormalize(parsed.output)
    const customEnvironment = {
      api: customLocationCreate(customBase, customEnvironmentSuffixes.api),
      identity: customLocationCreate(customBase, customEnvironmentSuffixes.identity),
      icons: customLocationCreate(customBase, customEnvironmentSuffixes.icons),
      notifications: customLocationCreate(customBase, customEnvironmentSuffixes.notifications),
      events: customLocationCreate(customBase, customEnvironmentSuffixes.events),
      webVault: customBase,
    }
    return extensionEnvironmentValidate(customEnvironment, op)
  }

  const sourceObject = parsed.output
  const region = sourceObject.region ?? "us"
  const base = sourceObject.baseUrl ?? sourceObject.base
  const defaults =
    base === undefined
      ? officialEnvironments[region]
      : {
          api: customLocationCreate(environmentLocationNormalize(base), customEnvironmentSuffixes.api),
          identity: customLocationCreate(environmentLocationNormalize(base), customEnvironmentSuffixes.identity),
          icons: customLocationCreate(environmentLocationNormalize(base), customEnvironmentSuffixes.icons),
          notifications: customLocationCreate(
            environmentLocationNormalize(base),
            customEnvironmentSuffixes.notifications,
          ),
          events: customLocationCreate(environmentLocationNormalize(base), customEnvironmentSuffixes.events),
          webVault: environmentLocationNormalize(base),
        }
  const environment = {
    api: environmentOverrideRead(sourceObject, "api") ?? defaults.api,
    identity: environmentOverrideRead(sourceObject, "identity") ?? defaults.identity,
    icons: environmentOverrideRead(sourceObject, "icons") ?? defaults.icons,
    notifications: environmentOverrideRead(sourceObject, "notifications") ?? defaults.notifications,
    events: environmentOverrideRead(sourceObject, "events") ?? defaults.events,
    webVault: environmentOverrideRead(sourceObject, "webVault") ?? defaults.webVault,
  }
  return extensionEnvironmentValidate(environment, op)
}

function extensionEnvironmentValidate(environment: ExtensionEnvironment, op: string): Result<ExtensionEnvironment> {
  const parsed = v.safeParse(extensionEnvironmentSchema, environment)
  if (!parsed.success) {
    return resultErrorCreate(op, v.summarize(parsed.issues), {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  return resultCreate(parsed.output)
}
