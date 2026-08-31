import { expect, test } from "bun:test"
import { iconCacheAdapterCreate } from "../../../src/server/contexts/icons/iconCacheAdapterCreate.js"
import { iconConfigCreate } from "../../../src/server/contexts/icons/iconConfigCreate.js"
import { iconFallbackIcon } from "../../../src/server/contexts/icons/iconFallbackIcon.js"
import type { IconHttpAdapter } from "../../../src/server/contexts/icons/iconHttpAdapter.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"

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
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const cache = iconCacheAdapterCreate({ clock })
  const app = serverAppCreate({
    clock,
    icons: { cache, http },
  })

  const first = await app.request("http://localhost/icons/Example.COM/icon.png")
  expect(first.status).toBe(200)
  expect(first.headers.get("content-type")).toBe("image/png")
  expect(first.headers.get("cache-control")).toBe("public, immutable, max-age=604800")
  expect(first.headers.get("expires")).toBe("Fri, 04 Sep 2026 00:00:00 GMT")
  expect(new Uint8Array(await first.arrayBuffer())).toEqual(testPng)
  expect(requested).toEqual(["https://example.com", "https://example.com/preferred.png"])

  const second = await app.request("http://localhost/icons/example.com/icon.png")
  expect(second.status).toBe(200)
  expect(new Uint8Array(await second.arrayBuffer())).toEqual(testPng)
  expect(requested).toHaveLength(2)

  const listIcon = await app.request("http://localhost/icons/example.com/icon.png?fallback=error")
  expect(listIcon.status).toBe(200)
  expect(listIcon.headers.get("cache-control")).toBe("public, immutable, max-age=604800")
  expect(new Uint8Array(await listIcon.arrayBuffer())).toEqual(testPng)
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
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const cache = iconCacheAdapterCreate({ clock })
  const app = serverAppCreate({ clock, icons: { cache, http } })

  const listFallback = await app.request("http://localhost/icons/no-such.test/icon.png?fallback=error")
  expect(listFallback.status).toBe(404)
  expect(listFallback.headers.get("cache-control")).toBe("public, immutable, max-age=259200")
  expect(new Uint8Array(await listFallback.arrayBuffer())).toEqual(iconFallbackIcon)
  const afterFailure = requests
  expect(afterFailure).toBeGreaterThan(0)

  const failed = await app.request("http://localhost/icons/no-such.test/icon.png")
  expect(failed.status).toBe(200)
  expect(failed.headers.get("content-type")).toBe("image/png")
  expect(new Uint8Array(await failed.arrayBuffer())).toEqual(iconFallbackIcon)
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
    icons: { cache, http },
  })

  const cached = await app.request("http://localhost/icons/example.com/icon.png")
  expect(new Uint8Array(await cached.arrayBuffer())).toEqual(testPng)
  expect(cached.headers.get("cache-control")).toBe("public, immutable, max-age=604800")
  expect(cached.headers.get("expires")).toBe("Fri, 04 Sep 2026 00:00:00 GMT")
  expect(requested).toHaveLength(0)

  timestamp += 604_800_000 - 1
  const beforeBoundary = await app.request("http://localhost/icons/example.com/icon.png")
  expect(new Uint8Array(await beforeBoundary.arrayBuffer())).toEqual(testPng)
  expect(requested).toHaveLength(0)

  timestamp += 1
  const refreshed = await app.request("http://localhost/icons/example.com/icon.png")
  expect(new Uint8Array(await refreshed.arrayBuffer())).toEqual(refreshedPng)
  expect(refreshed.headers.get("cache-control")).toBe("public, immutable, max-age=604800")
  expect(refreshed.headers.get("expires")).toBe("Fri, 11 Sep 2026 00:00:00 GMT")
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
