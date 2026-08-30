import { expect, test } from "bun:test"
import { responseSecurityHeadersApply } from "../../../src/server/responseSecurityHeadersApply.js"

const contentSecurityPolicy =
  "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:"

test("responseSecurityHeadersApply adds the global headers without changing the response", async () => {
  const response = new Response("unchanged", {
    headers: { "cache-control": "public, max-age=60", location: "/next" },
    status: 303,
  })

  expect(responseSecurityHeadersApply(response)).toBe(response)
  expect(response.status).toBe(303)
  expect(response.headers.get("cache-control")).toBe("public, max-age=60")
  expect(response.headers.get("location")).toBe("/next")
  expect(response.headers.get("content-security-policy")).toBeNull()
  expect(await response.text()).toBe("unchanged")
  expect(response.headers.get("x-content-type-options")).toBe("nosniff")
  expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN")
  expect(response.headers.get("referrer-policy")).toBe("no-referrer")
  expect(response.headers.get("permissions-policy")).toBe(
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  )
})

test("responseSecurityHeadersApply adds the exact CSP for marked SPA documents", () => {
  const response = new Response("<html></html>", { headers: { "content-type": "text/html" } })

  responseSecurityHeadersApply(response, { spaDocument: true })

  expect(response.headers.get("content-security-policy")).toBe(contentSecurityPolicy)
})
