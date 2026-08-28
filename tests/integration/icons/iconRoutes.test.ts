import { expect, test } from "bun:test"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { iconCacheAdapterCreate } from "../../../src/server/contexts/icons/iconCacheAdapterCreate.js"
import { iconConfigCreate } from "../../../src/server/contexts/icons/iconConfigCreate.js"
import { iconFallbackIcon } from "../../../src/server/contexts/icons/iconFallbackIcon.js"
import type { IconHttpAdapter } from "../../../src/server/contexts/icons/iconHttpAdapter.js"

const testPng = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])

function responseCreate(body: string | Uint8Array, status = 200, headers?: HeadersInit): Response {
  const value = typeof body === "string" ? body : (body.slice().buffer as ArrayBuffer)
  return new Response(value, { headers, status })
}

test("icons retrieve a preferred link, sniff MIME, and serve the cached icon", async () => {
  const requested: string[] = []
  const http: IconHttpAdapter = {
    fetch: async (url) => {
      requested.push(url)
      if (url === "https://example.com")
        return responseCreate('<head><link rel="icon" href="/preferred.png" sizes="32x32"></head>')
      if (url === "https://example.com/preferred.png")
        return responseCreate(testPng, 200, { "content-type": "text/html" })
      return responseCreate("missing", 404)
    },
  }
  const app = serverAppCreate({
    clock: clockTestCreate("2026-08-28T00:00:00.000Z"),
    icons: { cache: iconCacheAdapterCreate(), http },
  })

  const first = await app.request("http://localhost/icons/Example.COM/icon.png")
  expect(first.status).toBe(200)
  expect(first.headers.get("content-type")).toBe("image/png")
  expect(new Uint8Array(await first.arrayBuffer())).toEqual(testPng)
  expect(requested).toEqual(["https://example.com", "https://example.com/preferred.png"])

  const second = await app.request("http://localhost/icons/example.com/icon.png")
  expect(second.status).toBe(200)
  expect(new Uint8Array(await second.arrayBuffer())).toEqual(testPng)
  expect(requested).toHaveLength(2)
})

test("icons negative-cache failures, fall back, and do not retry blocked hosts", async () => {
  let requests = 0
  const http: IconHttpAdapter = {
    fetch: async () => {
      requests += 1
      throw new Error("offline")
    },
  }
  const cache = iconCacheAdapterCreate({ clock: clockTestCreate("2026-08-28T00:00:00.000Z") })
  const app = serverAppCreate({ icons: { cache, http } })

  const failed = await app.request("http://localhost/icons/no-such.test/icon.png")
  expect(failed.status).toBe(200)
  expect(failed.headers.get("content-type")).toBe("image/png")
  expect(new Uint8Array(await failed.arrayBuffer())).toEqual(iconFallbackIcon)
  const afterFailure = requests
  await app.request("http://localhost/icons/no-such.test/icon.png")
  expect(requests).toBe(afterFailure)

  const blocked = await app.request("http://localhost/icons/127.0.0.1/icon.png")
  expect(blocked.status).toBe(200)
  expect(requests).toBe(afterFailure)
  expect(await cache.stat("127.0.0.1.png.miss")).toBeUndefined()
})

test("icons refresh an expired positive cache entry", async () => {
  let timestamp = Date.parse("2026-08-28T00:00:00.000Z")
  const clock = { now: () => new Date(timestamp) }
  const cache = iconCacheAdapterCreate({ clock })
  await cache.write("example.com.png", testPng)
  const requested: string[] = []
  const refreshedPng = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 9, 8, 7])
  const http: IconHttpAdapter = {
    fetch: async (url) => {
      requested.push(url)
      if (url === "https://example.com") return responseCreate("<head></head>")
      return responseCreate(refreshedPng)
    },
  }
  const app = serverAppCreate({
    clock,
    icons: { cache, config: iconConfigCreate({ ICON_CACHE_TTL: 10 }), http },
  })

  const cached = await app.request("http://localhost/icons/example.com/icon.png")
  expect(new Uint8Array(await cached.arrayBuffer())).toEqual(testPng)
  expect(requested).toHaveLength(0)

  timestamp += 11_000
  const refreshed = await app.request("http://localhost/icons/example.com/icon.png")
  expect(new Uint8Array(await refreshed.arrayBuffer())).toEqual(refreshedPng)
  expect(requested).toEqual(["https://example.com", "https://example.com/favicon.ico"])
})

test("icons validate every redirect destination", async () => {
  let requests = 0
  const http: IconHttpAdapter = {
    fetch: async (url) => {
      requests += 1
      if (url === "https://public.example") return responseCreate("", 302, { location: "http://127.0.0.1/private" })
      return responseCreate(testPng)
    },
  }
  const cache = iconCacheAdapterCreate()
  const app = serverAppCreate({ icons: { cache, http } })
  const response = await app.request("http://localhost/icons/public.example/icon.png")

  expect(response.status).toBe(200)
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(iconFallbackIcon)
  expect(requests).toBe(1)
  expect(await cache.stat("public.example.png.miss")).toBeUndefined()
})

test("icons reject DNS resolutions to private addresses before fetching", async () => {
  let requests = 0
  const http: IconHttpAdapter = {
    fetch: async () => {
      requests += 1
      return responseCreate(testPng)
    },
    resolveHost: async () => ["192.168.1.20"],
  }
  const cache = iconCacheAdapterCreate()
  const app = serverAppCreate({ icons: { cache, http } })
  const response = await app.request("http://localhost/icons/rebound.example/icon.png")

  expect(response.status).toBe(200)
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(iconFallbackIcon)
  expect(requests).toBe(0)
  expect(await cache.stat("rebound.example.png.miss")).toBeUndefined()
})

test("external icon services preserve aliases, host validation, and redirect status", async () => {
  const app = serverAppCreate({
    icons: { config: iconConfigCreate({ ICON_REDIRECT_CODE: 307, ICON_SERVICE: "google" }) },
  })
  const response = await app.request("http://localhost/icons/Example.COM/icon.png")
  expect(response.status).toBe(307)
  expect(response.headers.get("location")).toBe("https://www.google.com/s2/favicons?domain=example.com&sz=32")

  const invalid = await app.request("http://localhost/icons/127.0.0.1/icon.png")
  expect(invalid.status).toBe(404)
})
