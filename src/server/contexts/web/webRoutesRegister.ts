import { readFile, realpath, stat } from "node:fs/promises"
import { resolve } from "node:path"
import type { Context, Hono } from "hono"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { identityOriginResolve } from "../identity/identityOriginResolve.js"
import { webContentTypeResolve } from "./webContentTypeResolve.js"
import { webFilePathResolve } from "./webFilePathResolve.js"
import { webNotFoundResponseCreate } from "./webNotFoundResponseCreate.js"
import type { WebRouteOptions } from "./webRouteOptions.js"
import { webTimestampCreate } from "./webTimestampCreate.js"

const defaultWebVaultFolder = "build/web"
const defaultSourceWebFolder = "src/web"
const defaultStaticFolder = "public/vw_static"
const defaultApiVersion = "0.0.0"
const defaultConfigVersion = "2026.6.0"
const webCacheLong = "public, immutable, max-age=604800"
const webCacheShort = "public, max-age=600"
const webVaultwardenCss = `/* OneWarden-compatible Vaultwarden stylesheet endpoint. */
body { margin: 0; }`
const staticFileNames = new Set([
  "404.css",
  "404.png",
  "admin.css",
  "admin.js",
  "admin_diagnostics.js",
  "admin_organizations.js",
  "admin_settings.js",
  "admin_users.js",
  "bootstrap.css",
  "bootstrap.bundle.js",
  "datatables.css",
  "datatables.js",
  "error-x.svg",
  "hibp.png",
  "jdenticon-3.3.0.js",
  "jquery-4.0.0.slim.js",
  "logo-gray.png",
  "mail-github.png",
  "vaultwarden-favicon.png",
  "vaultwarden-icon.png",
])

type WebResponseOptions = {
  cacheControl: string
  contentType?: string
}

export function webRoutesRegister(app: Hono<AuthenticationEnvironment>, options: WebRouteOptions): void {
  const webVaultEnabled = options.webVaultEnabled ?? true
  const webVaultFolders = webVaultFoldersResolve(options.webVaultFolder)
  const staticFolder = resolve(options.staticFolder ?? defaultStaticFolder)

  if (webVaultEnabled) {
    app.notFound(async (context) => {
      if (webPathIsApi(context.req.path)) return webNotFoundApiResponse("serverAppNotFound")
      if (context.req.method !== "GET") return webNotFoundResponseCreate()
      const response = await webFileResponseCreate(webVaultFolders, context.req.path.replace(/^\/+/, ""), {
        cacheControl: webCacheLong,
      })
      if (response !== undefined) return response
      if (webPathIsSpaRoute(context.req.path)) {
        const indexResponse = await webFileResponseCreate(webVaultFolders, "index.html", {
          cacheControl: webCacheShort,
        })
        if (indexResponse !== undefined) return indexResponse
      }
      return webNotFoundResponseCreate()
    })
  }

  const alive = () => {
    if (!webDatabaseHealthy(options.database)) return webDatabaseUnavailableResponse()
    return webJsonResponseCreate(webTimestampCreate(options.clock.now()))
  }

  const apiAlive = () => {
    if (!webDatabaseHealthy(options.database)) return webDatabaseUnavailableResponse()
    return webJsonResponseCreate(webTimestampCreate(options.clock.now()))
  }

  const aliveHead = () => new Response(null, { status: 200 })
  const now = () => webJsonResponseCreate(webTimestampCreate(options.clock.now()))
  const version = () => webJsonResponseCreate(options.version ?? defaultApiVersion)
  const webauthn = () => webJsonResponseCreate({ continuationToken: null, data: [], object: "list" })
  const config = (context: Context<AuthenticationEnvironment>) =>
    webJsonResponseCreate(webConfigurationCreate(options, context.req.url))

  app.get("/alive", alive)
  app.on("HEAD", "/alive", aliveHead)
  app.get("/api/alive", apiAlive)
  app.get("/api/now", now)
  app.get("/api/version", version)
  app.get("/api/webauthn", webauthn)
  app.get("/api/config", config)
  app.get("/vw_static/:filename", async (context) => {
    const filename = context.req.param("filename")
    if (!staticFileNames.has(filename)) return webNotFoundApiResponse("webStaticFile")
    const response = await webFileResponseCreate([staticFolder], filename, {
      cacheControl: webCacheLong,
    })
    if (response !== undefined) return response
    return webNotFoundApiResponse("webStaticFile")
  })

  if (!webVaultEnabled) return

  app.get("/", async (context) => {
    const response = await webFileResponseCreate(webVaultFolders, "index.html", {
      cacheControl: webCacheShort,
    })
    if (response !== undefined) return response
    return context.notFound()
  })
  app.get("/index.html", () => new Response(null, { headers: { location: "/" }, status: 303 }))
  app.on("HEAD", "/", () => new Response(null, { status: 200 }))
  app.get("/app-id.json", (context) => webAppIdResponse(options.publicOrigin, context.req.url))
  app.get("/.well-known/apple-app-site-association", () => webAppleAppSiteAssociationResponse())
  app.get("/css/vaultwarden.css", async () => {
    const response = await webFileResponseCreate(webVaultFolders, "css/vaultwarden.css", {
      cacheControl: webCacheLong,
      contentType: "text/css",
    })
    if (response !== undefined) return response
    return new Response(webVaultwardenCss, {
      headers: { "cache-control": webCacheLong, "content-type": "text/css" },
    })
  })
  app.get("/*", async (context, next) => {
    await next()
    return context.res
  })
}

function webVaultFoldersResolve(configuredFolder: string | undefined): string[] {
  if (configuredFolder !== undefined) return [resolve(configuredFolder)]
  return [resolve(defaultWebVaultFolder), resolve(defaultSourceWebFolder)]
}

async function webFileResponseCreate(
  folders: readonly string[],
  requestedPath: string,
  options: WebResponseOptions,
): Promise<Response | undefined> {
  const body = await webFileRead(folders, requestedPath)
  if (body === undefined) return undefined
  const contentType = options.contentType ?? webContentTypeResolve(requestedPath)
  const fileBuffer = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as unknown as ArrayBuffer
  return new Response(fileBuffer, {
    headers: { "cache-control": options.cacheControl, "content-type": contentType },
  })
}

async function webFileRead(folders: readonly string[], requestedPath: string): Promise<Uint8Array | undefined> {
  const decodedPath = webPathDecode(requestedPath)
  if (decodedPath === undefined) return undefined

  for (const folder of folders) {
    const path = webFilePathResolve(folder, decodedPath)
    if (path === undefined) return undefined
    const realPaths = await Promise.all([realpath(folder), realpath(path)]).catch(() => undefined)
    if (realPaths === undefined) continue
    const [realFolder, realFile] = realPaths
    const containedPath = webFilePathResolve(realFolder, realFile)
    if (containedPath === undefined) continue
    const fileStats = await stat(containedPath).catch(() => undefined)
    if (fileStats?.isFile() !== true) continue
    const contents = await readFile(containedPath).catch(() => undefined)
    if (contents !== undefined) return contents
  }
  return undefined
}

function webPathDecode(path: string): string | undefined {
  try {
    const decodedPath = decodeURIComponent(path)
    if (decodedPath.includes("\0") || decodedPath.includes("\\")) return undefined
    if (decodedPath.split("/").some((part) => part === "..")) return undefined
    return decodedPath.replace(/^\/+/, "")
  } catch {
    return undefined
  }
}

function webPathIsApi(path: string): boolean {
  const prefixes = ["/admin", "/api", "/attachments", "/events", "/icons", "/identity", "/notifications"]
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

function webPathIsSpaRoute(path: string): boolean {
  const normalized = path.replace(/\/+$/, "").toLowerCase()
  const routes = [
    "/",
    "/login",
    "/register",
    "/signup",
    "/verify",
    "/verify-email",
    "/verify-token",
    "/lock",
    "/unlock",
    "/two-factor",
    "/settings/two-factor",
    "/2fa",
    "/two-factor-setup",
    "/two-factor-challenge",
    "/2fa-challenge",
    "/demo",
    "/demo/admin",
    "/demo/all",
    "/demo/all-items",
    "/demo/vault",
    "/demo/login",
    "/demo/selected-login",
    "/demo/secure-note",
    "/demo/selected-secure-note",
    "/demo/note",
    "/demo/credit-card",
    "/demo/selected-credit-card",
    "/demo/card",
    "/demo/identity",
    "/demo/selected-identity",
    "/demo/ssh-key",
    "/demo/selected-ssh-key",
    "/demo/empty",
    "/demo/empty-state",
    "/demo/trash",
    "/demo/deleted",
    "/demo/locked",
    "/demo/lock",
    "/organizations",
    "/organization",
    "/org",
    "/demo/organizations",
    "/demo/organization",
    "/demo/org",
    "/settings",
    "/settings/account",
    "/settings/profile",
    "/settings/security",
    "/settings/email",
    "/settings/devices",
    "/settings/sessions",
    "/settings/tools",
    "/settings/import",
    "/settings/export",
    "/settings/danger",
    "/settings/delete-account",
    "/settings/emergency",
    "/sends",
    "/send",
    "/send-access",
    "/emergency-access",
    "/emergency",
    "/admin-ui",
    "/admin-ui/dashboard",
    "/admin-ui/users",
    "/admin-ui/organizations",
    "/admin-ui/diagnostics",
    "/admin-ui/config",
    "/admin-ui/tools",
    "/admin-ui/login",
  ]
  if (routes.includes(normalized)) return true
  return (
    normalized === "/ciphers" ||
    normalized.startsWith("/ciphers/") ||
    normalized === "/vault" ||
    normalized.startsWith("/vault/") ||
    normalized.startsWith("/send/") ||
    normalized.startsWith("/sends/access/")
  )
}

function webDatabaseHealthy(database: WebRouteOptions["database"]): boolean {
  if (database === undefined) return true
  try {
    database.query("SELECT 1").get()
    return true
  } catch {
    return false
  }
}

function webDatabaseUnavailableResponse(): Response {
  return apiErrorResponseCreate(apiErrorCreate("webAlive", "platform.unavailable", "Database unavailable."))
}

function webJsonResponseCreate(value: unknown): Response {
  return new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } })
}

function webNotFoundApiResponse(op: string): Response {
  return apiErrorResponseCreate(apiErrorCreate(op, "platform.not-found", "Not found."))
}

function webConfigurationCreate(options: WebRouteOptions, requestUrl: string): Record<string, unknown> {
  const domain = identityOriginResolve(options.publicOrigin, requestUrl)
  return {
    communication: null,
    environment: {
      api: `${domain}/api`,
      cloudRegion: null,
      identity: `${domain}/identity`,
      notifications: `${domain}/notifications`,
      sso: "",
      vault: domain,
    },
    featureStates: { "pm-19148-innovation-archive": true },
    gitHash: null,
    object: "config",
    push: { pushTechnology: 0, vapidPublicKey: null },
    server: { name: "Vaultwarden", url: "https://github.com/dani-garcia/vaultwarden" },
    settings: {
      disableUserRegistration: !options.config.SIGNUPS_ALLOWED,
      suppressOnboardingInterstitials: false,
    },
    version: options.version ?? defaultConfigVersion,
  }
}

function webAppIdResponse(configuredOrigin: string | undefined, requestUrl: string): Response {
  const origin = identityOriginResolve(configuredOrigin, requestUrl)
  return new Response(
    JSON.stringify({
      trustedFacets: [
        {
          ids: [origin, "ios:bundle-id:com.8bit.bitwarden", "android:apk-key-hash:dUGFzUzf3lmHSLBDBIv+WaFyZMI"],
          version: { major: 1, minor: 0 },
        },
      ],
    }),
    {
      headers: { "cache-control": webCacheLong, "content-type": "application/fido.trusted-apps+json" },
    },
  )
}

function webAppleAppSiteAssociationResponse(): Response {
  return new Response(
    JSON.stringify({
      webcredentials: { apps: ["LTZ2PFU5D6.com.8bit.bitwarden", "LTZ2PFU5D6.com.8bit.bitwarden.beta"] },
    }),
    {
      headers: { "cache-control": webCacheLong, "content-type": "application/json" },
    },
  )
}
