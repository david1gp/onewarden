import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import upstreamRouteManifest from "../../tools/compatibility/upstream-route-manifest.json"

const expectedFolderRoutes = [
  { method: "DELETE", path: "/api/folders/:folder_id" },
  { method: "GET", path: "/api/folders" },
  { method: "GET", path: "/api/folders/:folder_id" },
  { method: "POST", path: "/api/folders" },
  { method: "POST", path: "/api/folders/:folder_id" },
  { method: "POST", path: "/api/folders/:folder_id/delete" },
  { method: "PUT", path: "/api/folders/:folder_id" },
]

const expectedManifestFolderRoutes = [
  { method: "GET", path: "/api/folders" },
  { method: "GET", path: "/api/folders/:folder_id" },
  { method: "POST", path: "/api/folders" },
  { method: "POST", path: "/api/folders/:folder_id" },
  { method: "PUT", path: "/api/folders/:folder_id" },
  { method: "POST", path: "/api/folders/:folder_id/delete" },
  { method: "DELETE", path: "/api/folders/:folder_id" },
]

test("folder route registrations and method aliases remain upstream-compatible", () => {
  const registrations = serverRouteRegistrationIntrospect(serverAppCreate())
    .filter((route) => route.path.startsWith("/api/folders"))
    .map(({ method, path }) => ({ method, path }))
  expect(registrations).toEqual(expectedFolderRoutes.flatMap((route) => [route, route]))

  const manifestFolderRoutes = upstreamRouteManifest.routes
    .filter((route) => route.path.startsWith("/api/folders"))
    .map(({ method, path }) => ({ method, path }))
  expect(manifestFolderRoutes).toEqual(expectedManifestFolderRoutes)

  const folderAliasRouteIds = upstreamRouteManifest.aliases.find((alias) =>
    alias.routeIds.includes("core.18.get_folders"),
  )?.routeIds
  expect(folderAliasRouteIds).toEqual(["core.18.get_folders", "core.47.post_folders"])
})

test("folder authentication preserves the compatible missing-token error envelope", async () => {
  const response = await serverAppCreate().request("http://localhost/api/folders")
  expect(response.status).toBe(401)
  expect(await response.json()).toEqual({
    message: "No access token provided",
    validationErrors: { "": ["No access token provided"] },
    errorModel: { message: "No access token provided", object: "error" },
    error: "",
    error_description: "",
    exceptionMessage: null,
    exceptionStackTrace: null,
    innerExceptionMessage: null,
    object: "error",
  })
})
