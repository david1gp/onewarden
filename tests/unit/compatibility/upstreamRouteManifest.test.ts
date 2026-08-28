import { expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import * as v from "valibot"
import manifest from "../../../tools/compatibility/upstream-route-manifest.json"
import { upstreamRouteManifestGenerate } from "../../../tools/compatibility/upstreamRouteManifestGenerate.js"

const referenceRoot = "/home/david/opensource/vaultwarden"
const manifestPath = resolve("tools/compatibility/upstream-route-manifest.json")

const routeManifestSchema = v.object({
  aliases: v.array(
    v.object({
      canonicalRouteId: v.optional(v.pipe(v.string(), v.minLength(1))),
      kind: v.picklist(["legacy", "method-compatibility", "route-alternative"]),
      routeIds: v.pipe(v.array(v.pipe(v.string(), v.minLength(1))), v.minLength(2)),
    }),
  ),
  format: v.literal("onewarden-route-compatibility"),
  mounts: v.array(
    v.object({
      condition: v.pipe(v.string(), v.minLength(1)),
      group: v.picklist(["web", "core", "admin", "events", "identity", "icons", "notifications"]),
      prefix: v.pipe(v.string(), v.minLength(1)),
    }),
  ),
  routes: v.array(
    v.object({
      condition: v.picklist([
        "admin_disabled",
        "admin_enabled",
        "always",
        "debug_assertions && reload_templates",
        "icon_service_external",
        "icon_service_internal",
        "web_vault_enabled",
        "websocket_enabled",
      ]),
      handler: v.pipe(v.string(), v.minLength(1)),
      id: v.pipe(v.string(), v.minLength(1)),
      method: v.picklist(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]),
      mount: v.pipe(v.string(), v.minLength(1)),
      parameters: v.array(
        v.object({ kind: v.picklist(["path", "wildcard"]), name: v.pipe(v.string(), v.minLength(1)) }),
      ),
      path: v.pipe(v.string(), v.minLength(1)),
      query: v.array(v.object({ multiSegment: v.boolean(), name: v.pipe(v.string(), v.minLength(1)) })),
      rank: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
      rocketPath: v.pipe(v.string(), v.minLength(1)),
      source: v.object({
        file: v.pipe(v.string(), v.minLength(1)),
        line: v.pipe(v.number(), v.integer(), v.minValue(1)),
      }),
    }),
  ),
  source: v.object({
    extraction: v.pipe(v.string(), v.minLength(1)),
    repository: v.pipe(v.string(), v.url()),
    routeSource: v.pipe(v.string(), v.minLength(1)),
  }),
  version: v.pipe(v.number(), v.integer(), v.minValue(1)),
})

function manifestRouteFind(handler: string) {
  const route = manifest.routes.find((candidate) => candidate.handler === handler)
  expect(route).toBeDefined()
  if (route === undefined) throw new Error(`Missing route for ${handler}`)
  return route
}

test("checked-in upstream route manifest has a valid, unique route inventory", () => {
  const result = v.safeParse(routeManifestSchema, manifest)
  expect(result.success).toBe(true)
  if (!result.success) return

  const routeIds = result.output.routes.map((route) => route.id)
  expect(new Set(routeIds).size).toBe(routeIds.length)
  expect(result.output.routes.length).toBeGreaterThan(300)
  expect(result.output.mounts.map((mount) => mount.group)).toEqual([
    "web",
    "core",
    "admin",
    "events",
    "identity",
    "icons",
    "notifications",
  ])

  const routeById = new Map(result.output.routes.map((route) => [route.id, route]))
  const aliasKeys = new Set<string>()
  for (const alias of result.output.aliases) {
    expect(new Set(alias.routeIds).size).toBe(alias.routeIds.length)
    for (const routeId of alias.routeIds) expect(routeById.has(routeId)).toBe(true)
    const aliasKey = [...alias.routeIds].sort().join("|")
    expect(aliasKeys.has(aliasKey)).toBe(false)
    aliasKeys.add(aliasKey)

    if (alias.kind === "legacy") {
      const canonicalRouteId = alias.canonicalRouteId
      expect(canonicalRouteId).toBe(alias.routeIds[0])
      if (canonicalRouteId === undefined) continue
      expect(alias.routeIds).toContain(canonicalRouteId)
      continue
    }
    expect(alias.canonicalRouteId).toBeUndefined()
  }
})

test("manifest route identities are internally consistent", () => {
  const routeIdentityKeys = manifest.routes.map((route) => `${route.method} ${route.path} ${route.id}`)
  expect(new Set(routeIdentityKeys).size).toBe(routeIdentityKeys.length)

  for (const route of manifest.routes) {
    expect(route.id).toBe(`${route.id.split(".")[0]}.${route.source.line}.${route.handler}`)
    expect(route.path.startsWith(route.mount === "/" ? "/" : `${route.mount}/`)).toBe(true)

    for (const parameter of route.parameters) {
      expect(route.path).toContain(parameter.kind === "wildcard" ? "*" : `:${parameter.name}`)
    }
    for (const queryParameter of route.query) expect(route.rocketPath).toContain(`<${queryParameter.name}`)
  }
})

test("manifest preserves mounted paths, path parameters, queries, ranks, and conditions", () => {
  expect(manifestRouteFind("get_user_by_mail_json")).toMatchObject({
    condition: "admin_enabled",
    mount: "/admin",
    parameters: [{ kind: "path", name: "mail" }],
    path: "/admin/users/by-mail/:mail",
    query: [],
  })
  expect(manifestRouteFind("oidcsignin")).toMatchObject({
    condition: "always",
    mount: "/identity",
    path: "/identity/connect/oidc-signin",
    query: [
      { multiSegment: false, name: "code" },
      { multiSegment: false, name: "state" },
    ],
    rank: 1,
  })
  expect(manifestRouteFind("web_files")).toMatchObject({
    condition: "web_vault_enabled",
    parameters: [{ kind: "wildcard", name: "p" }],
    path: "/*",
    rank: 10,
  })
  expect(manifestRouteFind("post_events_collect")).toMatchObject({
    mount: "/events",
    path: "/events/collect",
  })
})

test("manifest aliases preserve explicit legacy aliases and every route collision", () => {
  const legacyAliases = manifest.aliases.filter((alias) => alias.kind === "legacy")
  expect(legacyAliases).toHaveLength(4)
  expect(
    legacyAliases.map((alias) => alias.routeIds.map((id) => manifest.routes.find((route) => route.id === id)?.handler)),
  ).toEqual([
    ["post_attachment_v2", "post_attachment", "post_attachment_admin"],
    ["post_access", "post_access_legacy"],
    ["post_access_file", "post_access_file_legacy"],
    ["get_organization_public_key", "get_organization_keys"],
  ])

  const registrations = new Map<string, string[]>()
  for (const route of manifest.routes) {
    const key = `${route.method} ${route.path}`
    registrations.set(key, [...(registrations.get(key) ?? []), route.id])
  }
  const collisionGroups = [...registrations.values()]
    .filter((routeIds) => routeIds.length > 1)
    .map((routeIds) => [...routeIds].sort())
  const alternativeGroups = manifest.aliases
    .filter((alias) => alias.kind === "route-alternative")
    .map((alias) => [...alias.routeIds].sort())
    .sort((left, right) => left.join("|").localeCompare(right.join("|")))
  expect(alternativeGroups).toEqual(
    collisionGroups.sort((left, right) => left.join("|").localeCompare(right.join("|"))),
  )

  const routesByPath = new Map<string, typeof manifest.routes>()
  for (const route of manifest.routes) routesByPath.set(route.path, [...(routesByPath.get(route.path) ?? []), route])
  const methodGroups = [...routesByPath.values()]
    .filter((routes) => new Set(routes.map((route) => route.method)).size > 1)
    .map((routes) => routes.map((route) => route.id).sort())
  const compatibilityGroups = manifest.aliases
    .filter((alias) => alias.kind === "method-compatibility")
    .map((alias) => [...alias.routeIds].sort())
    .sort((left, right) => left.join("|").localeCompare(right.join("|")))
  expect(compatibilityGroups).toEqual(methodGroups.sort((left, right) => left.join("|").localeCompare(right.join("|"))))
})

test("manifest generator reproduces the checked-in artifact byte-for-byte", async () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "onewarden-route-manifest-test-"))
  const generatedPath = join(temporaryDirectory, "manifest.json")

  try {
    await upstreamRouteManifestGenerate(referenceRoot, generatedPath)
    expect(await Bun.file(generatedPath).text()).toBe(await Bun.file(manifestPath).text())
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true })
  }
})
