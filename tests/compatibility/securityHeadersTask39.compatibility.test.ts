import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"

test("task 39 keeps non-SPA response status, body, cache, location, and content behavior", async () => {
  const app = serverAppCreate({ notifications: { enabled: true } })
  app.get("/redirect", () => new Response(null, { headers: { location: "/target" }, status: 302 }))
  app.get(
    "/attachment",
    () => new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "application/octet-stream" } }),
  )

  const redirectResponse = await app.request("http://localhost/redirect", { redirect: "manual" })
  expect(redirectResponse.status).toBe(302)
  expect(redirectResponse.headers.get("location")).toBe("/target")
  expect(await redirectResponse.text()).toBe("")
  expect(redirectResponse.headers.get("content-security-policy")).toBeNull()

  const attachmentResponse = await app.request("http://localhost/attachment")
  expect(attachmentResponse.status).toBe(200)
  expect(attachmentResponse.headers.get("content-type")).toBe("application/octet-stream")
  expect([...new Uint8Array(await attachmentResponse.arrayBuffer())]).toEqual([1, 2, 3])
  expect(attachmentResponse.headers.get("content-security-policy")).toBeNull()

  const notificationResponse = await app.request("http://localhost/notifications/anonymous-hub")
  expect(notificationResponse.status).toBe(426)
  expect(await notificationResponse.text()).toBe("WebSocket upgrade required.")
  expect(notificationResponse.headers.get("content-security-policy")).toBeNull()
})
