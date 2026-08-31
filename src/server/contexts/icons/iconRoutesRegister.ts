import type { Hono } from "hono"
import { iconCacheAdapterCreate } from "./iconCacheAdapterCreate.js"
import { iconConfigCreate } from "./iconConfigCreate.js"
import { iconContentTypeResolve } from "./iconContentTypeResolve.js"
import { iconFallbackIcon } from "./iconFallbackIcon.js"
import { iconGet } from "./iconGet.js"
import { iconHostBlocked } from "./iconHostBlocked.js"
import { iconHostValidate } from "./iconHostValidate.js"
import { iconHttpAdapterCreate } from "./iconHttpAdapterCreate.js"
import type { IconRouteOptions } from "./iconRouteOptions.js"

export function iconRoutesRegister(app: Hono<any>, options?: Partial<IconRouteOptions>): void {
  const clock = options?.clock
  const resolvedOptions: IconRouteOptions = {
    cache: options?.cache ?? iconCacheAdapterCreate({ clock }),
    clock: clock ?? { now: () => new Date() },
    config: options?.config ?? iconConfigCreate(),
    http: options?.http ?? iconHttpAdapterCreate(),
    logger: options?.logger,
  }
  if (resolvedOptions.config.ICON_SERVICE === "internal") {
    app.get("/icons/:host/icon.png", (context) =>
      iconInternalGet(context.req.param("host"), resolvedOptions, context.req.query("fallback") === "error"),
    )
    return
  }
  app.get("/icons/:host/icon.png", (context) => iconExternalGet(context.req.param("host"), resolvedOptions))
}

async function iconInternalGet(host: string, options: IconRouteOptions, fallbackAsError: boolean): Promise<Response> {
  const hostResult = iconHostValidate(host)
  if (!hostResult.success) return iconFallbackResponse(options.config.ICON_CACHE_NEGTTL, options, fallbackAsError)
  const path = `${hostResult.data}.png`

  if (await iconNegativeCacheFresh(path, options))
    return iconFallbackResponse(options.config.ICON_CACHE_NEGTTL, options, fallbackAsError)
  const cached = await iconCachedRead(path, options)
  if (cached !== undefined) {
    const subtype = iconContentTypeResolve(cached) ?? "x-icon"
    return iconImageResponse(cached, subtype, options.config.ICON_CACHE_TTL, options)
  }
  if (options.config.DISABLE_ICON_DOWNLOAD)
    return iconFallbackResponse(options.config.ICON_CACHE_NEGTTL, options, fallbackAsError)

  const result = await iconGet(hostResult.data, options)
  if (!result.success) {
    if (result.code !== "icons.blocked") await iconCacheWrite(`${path}.miss`, new Uint8Array(), options)
    return iconFallbackResponse(options.config.ICON_CACHE_NEGTTL, options, fallbackAsError)
  }
  await iconCacheWrite(path, result.data.bytes, options)
  return iconImageResponse(result.data.bytes, result.data.subtype, options.config.ICON_CACHE_TTL, options)
}

function iconExternalGet(host: string, options: IconRouteOptions): Response {
  const hostResult = iconHostValidate(host)
  if (!hostResult.success)
    return iconCachedResponse(new Response(null, { status: 404 }), options.config.ICON_CACHE_NEGTTL, options)
  if (iconHostBlocked(hostResult.data, options.config))
    return iconCachedResponse(new Response(null, { status: 404 }), options.config.ICON_CACHE_NEGTTL, options)

  const serviceUrl = iconServiceUrlResolve(options.config.ICON_SERVICE)
  const location = serviceUrl.replace("{}", hostResult.data)
  return iconCachedResponse(
    new Response(null, { headers: { Location: location }, status: options.config.ICON_REDIRECT_CODE }),
    options.config.ICON_CACHE_TTL,
    options,
  )
}

function iconServiceUrlResolve(service: string): string {
  if (service === "bitwarden") return "https://icons.bitwarden.net/{}/icon.png"
  if (service === "duckduckgo") return "https://icons.duckduckgo.com/ip3/{}.ico"
  if (service === "google") return "https://www.google.com/s2/favicons?domain={}&sz=32"
  return service
}

async function iconNegativeCacheFresh(path: string, options: IconRouteOptions): Promise<boolean> {
  const marker = `${path}.miss`
  const modifiedAt = await iconCacheStat(marker, options)
  if (modifiedAt === undefined) return false
  if (!iconCacheExpired(modifiedAt, options.config.ICON_CACHE_NEGTTL, options)) return true
  await iconCacheDelete(marker, options)
  return false
}

async function iconCachedRead(path: string, options: IconRouteOptions): Promise<Uint8Array | undefined> {
  const modifiedAt = await iconCacheStat(path, options)
  if (modifiedAt === undefined || iconCacheExpired(modifiedAt, options.config.ICON_CACHE_TTL, options)) return undefined
  try {
    return await options.cache.read(path)
  } catch {
    return undefined
  }
}

async function iconCacheStat(path: string, options: IconRouteOptions): Promise<number | undefined> {
  try {
    return await options.cache.stat(path)
  } catch {
    return undefined
  }
}

function iconCacheExpired(modifiedAt: number, ttl: number, options: IconRouteOptions): boolean {
  if (ttl === 0) return false
  return Math.max(0, options.clock.now().getTime() - modifiedAt) >= ttl * 1_000
}

async function iconCacheDelete(path: string, options: IconRouteOptions): Promise<void> {
  try {
    await options.cache.delete(path)
  } catch {
    options.logger?.warn("icons.cache-delete-failed", { path })
  }
}

async function iconCacheWrite(path: string, bytes: Uint8Array, options: IconRouteOptions): Promise<void> {
  try {
    await options.cache.write(path, bytes)
  } catch {
    options.logger?.warn("icons.cache-write-failed", { path })
  }
}

function iconFallbackResponse(ttl: number, options: IconRouteOptions, fallbackAsError: boolean): Response {
  return iconImageResponse(iconFallbackIcon, "png", ttl, options, fallbackAsError ? 404 : 200)
}

function iconImageResponse(
  bytes: Uint8Array,
  subtype: string,
  ttl: number,
  options: IconRouteOptions,
  status = 200,
): Response {
  return iconCachedResponse(
    new Response(bytes.slice().buffer as ArrayBuffer, {
      headers: { "Content-Type": `image/${subtype}`, "X-Content-Type-Options": "nosniff" },
      status,
    }),
    ttl,
    options,
  )
}

function iconCachedResponse(response: Response, ttl: number, options: IconRouteOptions): Response {
  const headers = new Headers(response.headers)
  headers.set("Cache-Control", `public, immutable, max-age=${ttl}`)
  headers.set("Expires", new Date(options.clock.now().getTime() + ttl * 1_000).toUTCString())
  headers.set("X-Content-Type-Options", "nosniff")
  return new Response(response.body, { headers, status: response.status, statusText: response.statusText })
}
