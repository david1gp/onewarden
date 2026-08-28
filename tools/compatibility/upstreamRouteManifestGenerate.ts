import { resolve } from "node:path"

const defaultReferenceRoot = "/home/david/opensource/vaultwarden"
const defaultOutputPath = "tools/compatibility/upstream-route-manifest.json"

type RouteCondition =
  | "admin_disabled"
  | "admin_enabled"
  | "always"
  | "debug_assertions && reload_templates"
  | "icon_service_external"
  | "icon_service_internal"
  | "web_vault_enabled"
  | "websocket_enabled"

type RouteParameter = {
  kind: "path" | "wildcard"
  name: string
}

type RouteQueryParameter = {
  multiSegment: boolean
  name: string
}

type UpstreamRoute = {
  condition: RouteCondition
  handler: string
  id: string
  method: string
  mount: string
  parameters: RouteParameter[]
  path: string
  query: RouteQueryParameter[]
  rank: number | null
  rocketPath: string
  source: {
    file: string
    line: number
  }
}

type RouteAlias = {
  canonicalRouteId?: string
  kind: "legacy" | "method-compatibility" | "route-alternative"
  routeIds: string[]
}

type RouteManifest = {
  aliases: RouteAlias[]
  format: string
  mounts: Array<{
    condition: string
    group: string
    prefix: string
  }>
  routes: UpstreamRoute[]
  source: {
    extraction: string
    repository: string
    routeSource: string
  }
  version: number
}

const routeAttributePattern = /#\[(get|post|put|delete|patch|options|head|route)\(([\s\S]*?)\)\]/g
const functionPattern = /(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)/
const routePathPattern = /\[[a-z]+\("([^"]+)"/
const pathParameterPattern = /<([A-Za-z0-9_]+)(\.\.)?>/g
const queryParameterPattern = /^<([^>.]+)(\.\.)?>$/

function upstreamRouteManifestMount(sourceFile: string, handler: string): { group: string; mount: string } {
  if (sourceFile === "src/api/web.rs") return { group: "web", mount: "/" }
  if (sourceFile === "src/api/admin.rs") return { group: "admin", mount: "/admin" }
  if (sourceFile === "src/api/identity.rs") return { group: "identity", mount: "/identity" }
  if (sourceFile === "src/api/icons.rs") return { group: "icons", mount: "/icons" }
  if (sourceFile === "src/api/notifications.rs") return { group: "notifications", mount: "/notifications" }
  if (sourceFile === "src/api/core/events.rs" && handler === "post_events_collect") {
    return { group: "events", mount: "/events" }
  }
  return { group: "core", mount: "/api" }
}

function upstreamRouteManifestCondition(sourceFile: string, handler: string): RouteCondition {
  if (sourceFile === "src/api/web.rs") {
    if (handler === "static_files_dev") return "debug_assertions && reload_templates"
    if (
      [
        "app_id",
        "apple_app_site_association",
        "vaultwarden_css",
        "web_files",
        "web_index",
        "web_index_direct",
        "web_index_head",
      ].includes(handler)
    ) {
      return "web_vault_enabled"
    }
  }
  if (sourceFile === "src/api/admin.rs") return handler === "admin_disabled" ? "admin_disabled" : "admin_enabled"
  if (sourceFile === "src/api/icons.rs")
    return handler === "icon_internal" ? "icon_service_internal" : "icon_service_external"
  if (sourceFile === "src/api/notifications.rs") return "websocket_enabled"
  return "always"
}

function upstreamRouteManifestNormalizePath(rocketPath: string, parameters: RouteParameter[]): string {
  const path = rocketPath.replace(pathParameterPattern, (_match, name: string, wildcard: string | undefined) => {
    parameters.push({ kind: wildcard === undefined ? "path" : "wildcard", name })
    return wildcard === undefined ? `:${name}` : "*"
  })
  return path === "//*" ? "/*" : path
}

function upstreamRouteManifestParseQuery(rocketPath: string): { path: string; query: RouteQueryParameter[] } {
  const queryStart = rocketPath.indexOf("?")
  if (queryStart === -1) return { path: rocketPath, query: [] }

  const path = rocketPath.slice(0, queryStart)
  const queryString = rocketPath.slice(queryStart + 1)

  const query = queryString.split("&").flatMap((value) => {
    const match = queryParameterPattern.exec(value)
    queryParameterPattern.lastIndex = 0
    return match === null || match[1] === undefined ? [] : [{ multiSegment: match[2] !== undefined, name: match[1] }]
  })
  return { path, query }
}

function upstreamRouteManifestParseSource(sourceFile: string, source: string): UpstreamRoute[] {
  const routes: UpstreamRoute[] = []
  for (const attributeMatch of source.matchAll(routeAttributePattern)) {
    const attribute = attributeMatch[0]
    const rocketPathMatch = routePathPattern.exec(attribute)
    if (rocketPathMatch === null) continue

    const attributeOffset = attributeMatch.index
    if (attributeOffset === undefined) continue
    const sourceLine = source.slice(0, attributeOffset).split("\n").length
    const functionMatch = functionPattern.exec(
      source.slice(attributeOffset + attribute.length, attributeOffset + attribute.length + 512),
    )
    if (functionMatch === null) continue

    const handler = functionMatch[1]
    const rocketPath = rocketPathMatch[1]
    const method = attributeMatch[1]
    if (handler === undefined || rocketPath === undefined || method === undefined) continue
    const { path: pathWithoutQuery, query } = upstreamRouteManifestParseQuery(rocketPath)
    const parameters: RouteParameter[] = []
    const path = upstreamRouteManifestNormalizePath(pathWithoutQuery, parameters)
    const { group, mount } = upstreamRouteManifestMount(sourceFile, handler)
    const rankMatch = /rank\s*=\s*(\d+)/.exec(attribute)

    routes.push({
      condition: upstreamRouteManifestCondition(sourceFile, handler),
      handler,
      id: `${group}.${sourceLine}.${handler}`,
      method: method.toUpperCase(),
      mount,
      parameters,
      path: mount === "/" ? path : `${mount}${path}`,
      query,
      rank: rankMatch === null ? null : Number(rankMatch[1]),
      rocketPath,
      source: { file: sourceFile, line: sourceLine },
    })
  }
  return routes
}

function upstreamRouteManifestAliases(routes: UpstreamRoute[]): RouteAlias[] {
  const legacyAliasDefinitions = [
    {
      canonical: { file: "src/api/core/ciphers.rs", handler: "post_attachment_v2" },
      aliases: ["post_attachment", "post_attachment_admin"],
    },
    {
      canonical: { file: "src/api/core/sends.rs", handler: "post_access" },
      aliases: ["post_access_legacy"],
    },
    {
      canonical: { file: "src/api/core/sends.rs", handler: "post_access_file" },
      aliases: ["post_access_file_legacy"],
    },
    {
      canonical: { file: "src/api/core/organizations.rs", handler: "get_organization_public_key" },
      aliases: ["get_organization_keys"],
    },
  ]
  const routeId = (file: string, handler: string): string => {
    const route = routes.find((candidate) => candidate.source.file === file && candidate.handler === handler)
    if (route === undefined) throw new Error(`No route found for ${file}:${handler}`)
    return route.id
  }
  const aliases: RouteAlias[] = legacyAliasDefinitions.map(({ aliases: aliasHandlers, canonical }) => {
    const canonicalRouteId = routeId(canonical.file, canonical.handler)
    return {
      canonicalRouteId,
      kind: "legacy" as const,
      routeIds: [canonicalRouteId, ...aliasHandlers.map((handler) => routeId(canonical.file, handler))],
    }
  })
  const samePathAndMethod = new Map<string, string[]>()
  const samePath = new Map<string, string[]>()

  for (const route of routes) {
    const methodKey = `${route.method} ${route.path}`
    samePathAndMethod.set(methodKey, [...(samePathAndMethod.get(methodKey) ?? []), route.id])
    samePath.set(route.path, [...(samePath.get(route.path) ?? []), route.id])
  }

  for (const routeIds of samePathAndMethod.values()) {
    if (routeIds.length > 1) aliases.push({ kind: "route-alternative", routeIds })
  }
  for (const routeIds of samePath.values()) {
    const methods = new Set(routes.filter((route) => routeIds.includes(route.id)).map((route) => route.method))
    if (methods.size > 1) aliases.push({ kind: "method-compatibility", routeIds })
  }
  return aliases
}

function upstreamRouteManifestSerialize(manifest: RouteManifest): string {
  const aliases = manifest.aliases.map(
    (alias, index) => `    ${JSON.stringify(alias)}${index + 1 === manifest.aliases.length ? "" : ","}`,
  )
  const routes = manifest.routes.map(
    (route, index) => `    ${JSON.stringify(route)}${index + 1 === manifest.routes.length ? "" : ","}`,
  )

  return [
    "{",
    '  "aliases": [',
    ...aliases,
    "  ],",
    `  "format": ${JSON.stringify(manifest.format)},`,
    `  "mounts": ${JSON.stringify(manifest.mounts)},`,
    '  "routes": [',
    ...routes,
    "  ],",
    `  "source": ${JSON.stringify(manifest.source)},`,
    `  "version": ${manifest.version}`,
    "}",
    "",
  ].join("\n")
}

async function upstreamRouteManifestSourceFiles(referenceRoot: string): Promise<string[]> {
  const glob = new Bun.Glob("src/api/**/*.rs")
  const files: string[] = []
  for await (const file of glob.scan({ cwd: referenceRoot, onlyFiles: true })) files.push(file)
  return files.sort()
}

export async function upstreamRouteManifestGenerate(
  referenceRoot = defaultReferenceRoot,
  outputPath = defaultOutputPath,
): Promise<void> {
  const routes: UpstreamRoute[] = []
  for (const relativeSourceFile of await upstreamRouteManifestSourceFiles(referenceRoot)) {
    const absoluteSourceFile = resolve(referenceRoot, relativeSourceFile)
    routes.push(...upstreamRouteManifestParseSource(relativeSourceFile, await Bun.file(absoluteSourceFile).text()))
  }

  const manifest: RouteManifest = {
    aliases: upstreamRouteManifestAliases(routes),
    format: "onewarden-route-compatibility",
    mounts: [
      { condition: "always", group: "web", prefix: "/" },
      { condition: "always", group: "core", prefix: "/api" },
      { condition: "admin token configured or disabled", group: "admin", prefix: "/admin" },
      { condition: "always", group: "events", prefix: "/events" },
      { condition: "always", group: "identity", prefix: "/identity" },
      { condition: "always", group: "icons", prefix: "/icons" },
      { condition: "websocket enabled", group: "notifications", prefix: "/notifications" },
    ],
    routes,
    source: {
      extraction: '#[method("/route")] attributes under src/api/**/*.rs',
      repository: "https://github.com/dani-garcia/vaultwarden",
      routeSource: "src/api/**/*.rs",
    },
    version: 1,
  }

  await Bun.write(outputPath, upstreamRouteManifestSerialize(manifest))
}

if (import.meta.main) {
  await upstreamRouteManifestGenerate()
}
