import type { KeyInput } from "jose"
import type { Clock } from "../../../shared/clock/clock.js"
import { clockCreate } from "../../../shared/clock/clockCreate.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { identifierCreate } from "../../../shared/identifier/identifierCreate.js"
import { identityAccessTokenClaimsDecode } from "../identity/identityAccessTokenClaimsDecode.js"
import { identityOriginResolve } from "../identity/identityOriginResolve.js"
import { notificationAnonymousConnectionRegistryCreate } from "./notificationAnonymousConnectionRegistry.js"
import { notificationAnonymousUpdateFrameCreate } from "./notificationAnonymousUpdateFrameCreate.js"
import { notificationAdapterCreate } from "./notificationAdapterCreate.js"
import { notificationConnectionRegistryCreate } from "./notificationConnectionRegistry.js"
import type { NotificationHub } from "./notificationHub.js"
import { notificationPingFrameCreate } from "./notificationPingFrameCreate.js"
import { notificationSignalRHandshake } from "./notificationSignalRHandshake.js"
import type { NotificationWebSocketData } from "./notificationWebSocketData.js"
import type { NotificationWebSocketServer } from "./notificationWebSocketServer.js"
import { notificationUpdateType } from "./notificationUpdateType.js"

type NotificationHubCreateOptions = {
  clock?: Clock
  enabled?: boolean
  identifier?: Identifier
  proxy?: boolean
  publicKey?: KeyInput
  publicOrigin?: string
}

export function notificationHubCreate(options?: NotificationHubCreateOptions): NotificationHub {
  const clock = options?.clock ?? clockCreate()
  const enabled = options?.enabled ?? true
  const identifier = options?.identifier ?? identifierCreate()
  const authenticated = notificationConnectionRegistryCreate()
  const anonymous = notificationAnonymousConnectionRegistryCreate()
  const adapter = notificationAdapterCreate(authenticated)
  const ping = notificationPingFrameCreate()
  const pingIntervals = new Map<string, ReturnType<typeof setInterval>>()
  const connectionCleanups = new Map<string, () => void>()

  const upgrade = async (request: Request, server: NotificationWebSocketServer): Promise<Response | undefined> => {
    if (!enabled || request.headers.get("upgrade")?.toLowerCase() !== "websocket") return undefined
    const url = new URL(request.url)
    if (url.pathname === "/notifications/hub") return authenticatedUpgrade(request, server, url)
    if (url.pathname === "/notifications/anonymous-hub") return anonymousUpgrade(request, server, url)
    return undefined
  }

  const websocket: Bun.WebSocketHandler<NotificationWebSocketData> = {
    close: (ws) => {
      if (ws.data.closed) return
      ws.data.closed = true
      const interval = pingIntervals.get(ws.data.connectionId)
      if (interval !== undefined) {
        clearInterval(interval)
        pingIntervals.delete(ws.data.connectionId)
      }
      connectionCleanups.get(ws.data.connectionId)?.()
    },
    message: (ws, message) => {
      if (typeof message === "string") {
        const response = notificationSignalRHandshake(message)
        if (response !== undefined) {
          ws.sendBinary(response)
          return
        }
        return
      }
      ws.sendBinary(message)
    },
    open: (ws) => {
      if (ws.data.closed) return
      let remove = (): void => undefined
      let cleaned = false
      const cleanup = (): void => {
        if (cleaned) return
        cleaned = true
        const interval = pingIntervals.get(ws.data.connectionId)
        if (interval !== undefined) {
          clearInterval(interval)
          pingIntervals.delete(ws.data.connectionId)
        }
        remove()
        connectionCleanups.delete(ws.data.connectionId)
        if (ws.data.kind === "anonymous") anonymous.release(ws.data.ip)
      }
      const connection = {
        close: (): void => {
          cleanup()
          ws.close(1011, "Notification send failed")
        },
        send: (data: Uint8Array): boolean => {
          try {
            return ws.sendBinary(data) !== 0
          } catch {
            return false
          }
        },
      }
      remove =
        ws.data.kind === "anonymous"
          ? anonymous.add(ws.data.key, ws.data.connectionId, connection)
          : authenticated.add(ws.data.key, ws.data.connectionId, connection)
      connectionCleanups.set(ws.data.connectionId, cleanup)
      pingIntervals.set(
        ws.data.connectionId,
        setInterval(() => ws.ping(ping), 15_000),
      )
    },
    ping: (ws, data) => {
      ws.pong(data)
    },
  }

  const sendAnonymousAuthResponse = (userId: string, authRequestId: string): void => {
    anonymous.send(
      authRequestId,
      notificationAnonymousUpdateFrameCreate({
        payload: { Id: authRequestId, UserId: userId },
        type: notificationUpdateType.authRequestResponse,
        userId,
      }),
    )
  }

  const authenticatedUpgrade = async (
    request: Request,
    server: NotificationWebSocketServer,
    url: URL,
  ): Promise<Response | undefined> => {
    const token = url.searchParams.get("access_token") ?? notificationAuthorizationTokenResolve(request)
    if (token === undefined) return new Response("Invalid claim", { status: 401 })
    const issuer = identityOriginResolve(options?.publicOrigin, request.url)
    const claimsResult = await identityAccessTokenClaimsDecode(token, options?.publicKey, issuer, clock)
    if (!claimsResult.success) return new Response("Invalid token", { status: 401 })
    const connectionId = identifier.uuid()
    const upgraded = server.upgrade(request, {
      data: {
        connectionId,
        ip: notificationClientIpResolve(request, server, options?.proxy),
        key: claimsResult.data.sub,
        kind: "authenticated",
      },
    })
    if (upgraded) return undefined
    return new Response("WebSocket upgrade failed", { status: 400 })
  }

  const anonymousUpgrade = async (
    request: Request,
    server: NotificationWebSocketServer,
    url: URL,
  ): Promise<Response | undefined> => {
    const token = url.searchParams.get("token")
    if (token === null) return new Response("Invalid token", { status: 400 })
    const ip = notificationClientIpResolve(request, server, options?.proxy)
    if (!anonymous.reserve(ip)) return new Response("Too many connections", { status: 429 })
    const connectionId = identifier.uuid()
    let released = false
    const release = (): void => {
      if (released) return
      released = true
      connectionCleanups.delete(connectionId)
      anonymous.release(ip)
    }
    connectionCleanups.set(connectionId, release)
    let upgraded = false
    try {
      upgraded = server.upgrade(request, { data: { connectionId, ip, key: token, kind: "anonymous" } })
    } catch {
      release()
      return new Response("WebSocket upgrade failed", { status: 400 })
    }
    if (upgraded) return undefined
    release()
    return new Response("WebSocket upgrade failed", { status: 400 })
  }

  return { adapter, anonymous, authenticated, enabled, sendAnonymousAuthResponse, upgrade, websocket }
}

function notificationAuthorizationTokenResolve(request: Request): string | undefined {
  const authorization = request.headers.get("authorization")
  if (authorization === null) return undefined
  const marker = "Bearer "
  const markerIndex = authorization.lastIndexOf(marker)
  return markerIndex === -1 ? authorization : authorization.slice(markerIndex + marker.length)
}

function notificationClientIpResolve(request: Request, server: NotificationWebSocketServer, proxy = false): string {
  if (!proxy) return server.requestIP?.(request)?.address ?? "0.0.0.0"
  return (
    request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ?? "0.0.0.0"
  )
}
