import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"

const expectedSecurityHeaders = {
  "cache-control": "no-cache, no-store, max-age=0",
  "content-security-policy": expect.any(String),
  "cross-origin-resource-policy": "same-origin",
  "permissions-policy": expect.any(String),
  "referrer-policy": "same-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "x-robots-tag": "noindex, nofollow",
  "x-xss-protection": "0",
}

const memoryApplication = () => serverAppCreate({ databasePath: ":memory:" })

test.each([
  ["GET", "/alive"],
  ["GET", "/api/alive"],
] as const)("%s %s returns a database-backed RFC3339 timestamp", async (method, path) => {
  const response = await memoryApplication().request(`http://onewarden.test${path}`, { method })
  const timestamp = await response.json()

  expect(response.status).toBe(200)
  expect(response.headers.get("content-type")).toBe("application/json")
  expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/)
  expect(Object.fromEntries(response.headers)).toEqual(expect.objectContaining(expectedSecurityHeaders))
})

test("HEAD /alive checks the database and returns no body", async () => {
  const response = await memoryApplication().request("http://onewarden.test/alive", { method: "HEAD" })

  expect(response.status).toBe(200)
  expect(await response.text()).toBe("")
  expect(Object.fromEntries(response.headers)).toEqual(expect.objectContaining(expectedSecurityHeaders))
})

test.each([
  ["GET", "/alive"],
  ["HEAD", "/alive"],
  ["GET", "/api/alive"],
] as const)("%s %s reports unavailable database readiness", async (method, path) => {
  const response = await serverAppCreate({
    databasePath: "/onewarden-parent-that-does-not-exist/onewarden.sqlite",
  }).request(`http://onewarden.test${path}`, { method })

  expect(response.status).toBe(503)
  expect(Object.fromEntries(response.headers)).toEqual(expect.objectContaining(expectedSecurityHeaders))
  if (method === "GET") expect(await response.json()).toEqual(expect.objectContaining({ error: expect.any(Object) }))
  if (method === "HEAD") expect(await response.text()).toBe("")
})
