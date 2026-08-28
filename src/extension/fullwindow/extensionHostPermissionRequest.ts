import type { Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionEnvironmentResolve } from "../api/extensionEnvironmentResolve.js"
import type { ExtensionEnvironmentSource } from "../api/extensionEnvironmentSourceSchema.js"
import type { ExtensionFullWindowEnvironmentSettings } from "./ExtensionFullWindowEnvironmentSettings.js"

type ExtensionPermissionsApi = {
  request: (permissions: { origins?: string[] }) => Promise<boolean>
}

function extensionPermissionsRead(): ExtensionPermissionsApi | undefined {
  const extensionChrome = globalThis as typeof globalThis & { chrome?: { permissions?: ExtensionPermissionsApi } }
  return extensionChrome.chrome?.permissions
}

function extensionEnvironmentSourceCreate(
  settings: ExtensionFullWindowEnvironmentSettings,
): ExtensionEnvironmentSource {
  const overrides = {
    ...(settings.api.trim() === "" ? {} : { api: settings.api }),
    ...(settings.identity.trim() === "" ? {} : { identity: settings.identity }),
  }
  if (settings.region === "selfHosted") return { base: settings.base, ...overrides }
  if (Object.keys(overrides).length === 0) return settings.region
  return { region: settings.region, ...overrides }
}

function extensionHostPermissionOriginCreate(location: string): Result<string> {
  const op = "extensionHostPermissionRequest.originCreate"
  let parsed: URL
  try {
    parsed = new URL(location)
  } catch {
    return resultErrorCreate(op, "Server location is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return resultErrorCreate(op, "Server location must use HTTP or HTTPS.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  return resultCreate(`${parsed.origin}/*`)
}

/** Requests only the API and identity origins selected by the user. */
export function extensionHostPermissionRequest(
  settings: ExtensionFullWindowEnvironmentSettings,
  permissions: ExtensionPermissionsApi | undefined = extensionPermissionsRead(),
): Promise<Result<void>> {
  const op = "extensionHostPermissionRequest"
  const environmentResult = extensionEnvironmentResolve(extensionEnvironmentSourceCreate(settings))
  if (!environmentResult.success) {
    return Promise.resolve(
      resultErrorCreate(op, "Server settings are invalid.", {
        code: "platform.invalid-request",
        statusCode: 400,
      }),
    )
  }
  if (permissions === undefined) return Promise.resolve(resultCreate(undefined))

  const origins = new Set<string>()
  for (const location of [environmentResult.data.api, environmentResult.data.identity]) {
    const originResult = extensionHostPermissionOriginCreate(location)
    if (!originResult.success) return Promise.resolve(originResult)
    origins.add(originResult.data)
  }

  let requestResult: Promise<boolean>
  try {
    requestResult = permissions.request({ origins: [...origins] })
  } catch {
    return Promise.resolve(
      resultErrorCreate(op, "Server access permission could not be requested.", {
        code: "platform.unavailable",
        statusCode: 503,
      }),
    )
  }
  return requestResult.then(
    (granted) =>
      granted
        ? resultCreate(undefined)
        : resultErrorCreate(op, "Server access permission was not granted.", {
            code: "platform.forbidden",
            statusCode: 403,
          }),
    () =>
      resultErrorCreate(op, "Server access permission could not be requested.", {
        code: "platform.unavailable",
        statusCode: 503,
      }),
  )
}
