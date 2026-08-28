import { expect, test } from "bun:test"
import { HTTPException } from "hono/http-exception"
import * as v from "valibot"
import { clockTestCreate } from "../../src/shared/clock/clockTestCreate.js"
import { identifierTestCreate } from "../../src/shared/identifier/identifierTestCreate.js"
import { loggerCreate } from "../../src/shared/logging/loggerCreate.js"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { apiErrorResponseCreate } from "../../src/shared/api/apiErrorResponseCreate.js"
import { requestBodyParse } from "../../src/shared/validation/requestBodyParse.js"
import { requestHeaderParse } from "../../src/shared/validation/requestHeaderParse.js"
import { requestPathParse } from "../../src/shared/validation/requestPathParse.js"
import { requestQueryParse } from "../../src/shared/validation/requestQueryParse.js"

test("serverAppCreate serves the health response", async () => {
  const app = serverAppCreate()
  const response = await app.request("http://localhost/health")

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ status: "ok" })
})

test("serverAppCreate correlates requests and logs only safe request metadata", async () => {
  const entries: unknown[] = []
  const clock = clockTestCreate("2026-08-27T12:00:00.000Z")
  const app = serverAppCreate({
    clock,
    identifier: identifierTestCreate(["generated-request"]),
    logger: loggerCreate({ clock, sink: (entry) => entries.push(entry) }),
  })

  const response = await app.request("http://localhost/health?access_token=do-not-log", {
    headers: { "x-request-id": "incoming-request" },
  })

  expect(response.headers.get("x-request-id")).toBe("incoming-request")
  expect(entries).toEqual([
    {
      timestamp: "2026-08-27T12:00:00.000Z",
      level: "info",
      message: "request.started",
      fields: { method: "GET", path: "/health", requestId: "incoming-request" },
    },
    {
      timestamp: "2026-08-27T12:00:00.000Z",
      level: "info",
      message: "request.completed",
      fields: { durationMs: 0, method: "GET", path: "/health", requestId: "incoming-request", status: 200 },
    },
  ])
  expect(JSON.stringify(entries)).not.toContain("do-not-log")
})

test("serverAppCreate maps not-found and thrown errors to API errors", async () => {
  const app = serverAppCreate({ web: { webVaultEnabled: false } })
  app.get("/unauthorized", () => {
    throw new HTTPException(401, { message: "Authentication is required." })
  })
  app.get("/broken", () => {
    throw new Error("secret implementation detail")
  })

  const notFoundResponse = await app.request("http://localhost/missing")
  expect(notFoundResponse.status).toBe(404)
  expect(await notFoundResponse.json()).toMatchObject({ message: "Not found.", object: "error" })

  const unauthorizedResponse = await app.request("http://localhost/unauthorized")
  expect(unauthorizedResponse.status).toBe(401)
  expect(await unauthorizedResponse.json()).toMatchObject({ message: "Authentication is required." })

  const brokenResponse = await app.request("http://localhost/broken")
  expect(brokenResponse.status).toBe(500)
  expect(await brokenResponse.json()).toMatchObject({ message: "Internal server error." })
})

test("request parsers map body, path, query, and header failures without throwing", async () => {
  const app = serverAppCreate()
  const bodySchema = v.object({ name: v.pipe(v.string(), v.minLength(2)) })
  const pathSchema = v.object({ id: v.pipe(v.string(), v.regex(/^vault-/)) })
  const querySchema = v.object({ search: v.pipe(v.string(), v.minLength(2)) })
  const headerSchema = v.object({ "x-client-version": v.string() })

  app.post("/requests/:id", async (context) => {
    const pathResult = requestPathParse(context, pathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const queryResult = requestQueryParse(context, querySchema)
    if (!queryResult.success) return apiErrorResponseCreate(queryResult)
    const headerResult = requestHeaderParse(context, headerSchema)
    if (!headerResult.success) return apiErrorResponseCreate(headerResult)
    const bodyResult = await requestBodyParse(context, bodySchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    return context.json({ id: pathResult.data.id, search: queryResult.data.search, name: bodyResult.data.name })
  })

  const validResponse = await app.request("http://localhost/requests/vault-1?search=one", {
    body: JSON.stringify({ name: "Alice" }),
    headers: { "content-type": "application/json", "x-client-version": "1" },
    method: "POST",
  })
  expect(validResponse.status).toBe(200)
  expect(await validResponse.json()).toEqual({ id: "vault-1", search: "one", name: "Alice" })

  const invalidQueryResponse = await app.request("http://localhost/requests/vault-1?search=x", {
    headers: { "content-type": "application/json", "x-client-version": "1" },
    method: "POST",
  })
  expect(invalidQueryResponse.status).toBe(400)
  expect(await invalidQueryResponse.json()).toMatchObject({
    message: "Invalid request.",
    validationErrors: { search: [expect.any(String)] },
  })

  const invalidPathResponse = await app.request("http://localhost/requests/item-1?search=one", {
    headers: { "content-type": "application/json", "x-client-version": "1" },
    method: "POST",
  })
  expect(invalidPathResponse.status).toBe(400)

  const invalidHeaderResponse = await app.request("http://localhost/requests/vault-1?search=one", {
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  expect(invalidHeaderResponse.status).toBe(400)

  const invalidBodyResponse = await app.request("http://localhost/requests/vault-1?search=one", {
    body: "not-json",
    headers: { "content-type": "application/json", "x-client-version": "1" },
    method: "POST",
  })
  expect(invalidBodyResponse.status).toBe(400)
  expect(await invalidBodyResponse.json()).toMatchObject({ message: "Request body must be valid JSON." })
})
