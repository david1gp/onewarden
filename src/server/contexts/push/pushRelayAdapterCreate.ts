import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { clockCreate } from "../../../shared/clock/clockCreate.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { identifierCreate } from "../../../shared/identifier/identifierCreate.js"
import type { Logger } from "../../../shared/logging/logger.js"
import { loggerCreate } from "../../../shared/logging/loggerCreate.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { IdentityDevice } from "../identity/identityDevice.js"
import { identityDeviceIsMobile } from "../identity/identityDeviceIsMobile.js"
import type { PushRelayAdapter } from "./pushRelayAdapter.js"
import type { PushRelayConfiguration } from "./pushRelayConfiguration.js"
import type { PushRelayNotification } from "./pushRelayNotification.js"
import * as v from "valibot"

const pushRelayTokenResponseSchema = v.object({
  access_token: v.pipe(v.string(), v.minLength(1)),
  expires_in: v.pipe(v.number(), v.integer()),
})

type PushRelayAdapterCreateOptions = {
  clock?: Clock
  fetch?: PushRelayFetcher
  identifier?: Identifier
  logger?: Logger
}

type PushRelayFetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

type CachedPushRelayToken = {
  accessToken: string
  validUntil: number
}

export function pushRelayAdapterCreate(
  configuration: PushRelayConfiguration,
  options?: PushRelayAdapterCreateOptions,
): PushRelayAdapter {
  const clock = options?.clock ?? clockCreate()
  const fetcher = options?.fetch ?? globalThis.fetch
  const identifier = options?.identifier ?? identifierCreate()
  const logger = options?.logger ?? loggerCreate({ clock })
  let cachedToken: CachedPushRelayToken | undefined
  let tokenRequest: Promise<Result<string>> | undefined

  const authApiTokenAcquire = async (): Promise<Result<string>> => {
    const now = clock.now().getTime()
    if (cachedToken !== undefined && cachedToken.validUntil > now) return resultCreate(cachedToken.accessToken)
    if (tokenRequest !== undefined) return tokenRequest

    tokenRequest = (async () => {
      let response: Response
      try {
        response = await fetcher(joinUri(configuration.identityUri, "/connect/token"), {
          body: new URLSearchParams({
            grant_type: "client_credentials",
            scope: "api.push",
            client_id: `installation.${configuration.installationId}`,
            client_secret: configuration.installationKey,
          }),
          headers: { "content-type": "application/x-www-form-urlencoded" },
          method: "POST",
        })
      } catch {
        return resultErrorCreate("pushRelayTokenAcquire", "Push identity token request failed.", {
          code: "platform.unavailable",
          statusCode: 503,
        })
      }
      if (!response.ok)
        return resultErrorCreate("pushRelayTokenAcquire", "Push identity token request failed.", {
          code: "platform.unavailable",
          statusCode: 503,
        })

      let body: unknown
      try {
        body = await response.json()
      } catch {
        return resultErrorCreate("pushRelayTokenAcquire", "Invalid push identity token response.", {
          code: "platform.unavailable",
          statusCode: 503,
        })
      }
      const parsed = v.safeParse(pushRelayTokenResponseSchema, body)
      if (!parsed.success)
        return resultErrorCreate("pushRelayTokenAcquire", "Invalid push identity token response.", {
          code: "platform.unavailable",
          statusCode: 503,
        })

      const validUntil = clock.now().getTime() + Math.max(0, Math.floor(parsed.output.expires_in / 2)) * 1_000
      cachedToken = { accessToken: parsed.output.access_token, validUntil }
      return resultCreate(parsed.output.access_token)
    })()
    const result = await tokenRequest
    tokenRequest = undefined
    return result
  }

  const registerDevice = async (device: IdentityDevice): Promise<Result<void>> => {
    const op = "pushRelayDeviceRegister"
    if (!configuration.enabled || !identityDeviceIsMobile(device) || device.pushToken === null)
      return resultCreate(undefined)
    if (device.pushUuid === null) device.pushUuid = identifier.uuid()

    const tokenResult = await authApiTokenAcquire()
    if (!tokenResult.success)
      return resultErrorCreate(op, tokenResult.errorMessage, { code: "platform.unavailable", statusCode: 503 })

    let response: Response
    try {
      response = await fetcher(joinUri(configuration.relayUri, "/push/register"), {
        body: JSON.stringify({
          deviceId: device.pushUuid,
          pushToken: device.pushToken,
          userId: device.userUuid,
          type: device.type,
          identifier: device.uuid,
          installationId: configuration.installationId,
        }),
        headers: {
          accept: "application/json",
          authorization: `Bearer ${tokenResult.data}`,
          "content-type": "application/json",
        },
        method: "POST",
      })
    } catch {
      return resultErrorCreate(op, "Push relay device registration failed.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
    if (!response.ok)
      return resultErrorCreate(op, "Push relay device registration failed.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    return resultCreate(undefined)
  }

  const unregisterDevice = async (pushUuid: string | null): Promise<Result<void>> => {
    const op = "pushRelayDeviceUnregister"
    if (!configuration.enabled || pushUuid === null) return resultCreate(undefined)
    const tokenResult = await authApiTokenAcquire()
    if (!tokenResult.success)
      return resultErrorCreate(op, tokenResult.errorMessage, { code: "platform.unavailable", statusCode: 503 })
    try {
      await fetcher(joinUri(configuration.relayUri, `/push/delete/${encodeURIComponent(pushUuid)}`), {
        headers: { authorization: `Bearer ${tokenResult.data}` },
        method: "POST",
      })
    } catch {
      return resultErrorCreate(op, "Push relay device unregistration failed.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
    return resultCreate(undefined)
  }

  const dispatch = async (notification: PushRelayNotification): Promise<void> => {
    if (!configuration.enabled) return
    const tokenResult = await authApiTokenAcquire()
    if (!tokenResult.success) {
      logger.debug("push.relay.token-failed")
      return
    }
    try {
      await fetcher(joinUri(configuration.relayUri, "/push/send"), {
        body: JSON.stringify(notification),
        headers: {
          accept: "application/json",
          authorization: `Bearer ${tokenResult.data}`,
          "content-type": "application/json",
        },
        method: "POST",
      })
    } catch {
      logger.error("push.relay.dispatch-failed")
    }
  }

  return { dispatch, registerDevice, unregisterDevice }
}

function joinUri(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path}`
}
