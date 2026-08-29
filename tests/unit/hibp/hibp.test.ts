import { expect, test } from "bun:test"
import { hibpBreachGet } from "../../../src/server/contexts/hibp/hibpBreachGet.js"
import { hibpBreachNotFoundResponseCreate } from "../../../src/server/contexts/hibp/hibpBreachNotFoundResponseCreate.js"
import { hibpBreachResponseCreate } from "../../../src/server/contexts/hibp/hibpBreachResponseCreate.js"
import { hibpBreachSyntheticResponseCreate } from "../../../src/server/contexts/hibp/hibpBreachSyntheticResponseCreate.js"
import { hibpBreachUrlCreate } from "../../../src/server/contexts/hibp/hibpBreachUrlCreate.js"
import type { HibpHttpAdapter } from "../../../src/server/contexts/hibp/hibpHttpAdapter.js"
import { hibpUsernameEncode } from "../../../src/server/contexts/hibp/hibpUsernameEncode.js"

function httpAdapterCreate(response: Response | (() => Promise<Response>)): HibpHttpAdapter {
  return {
    fetch: async () => (typeof response === "function" ? response() : response),
  }
}

test("hibpUsernameEncode uses upstream form-url-encoding", () => {
  expect(hibpUsernameEncode("connect#bwpm@simplelogin.co")).toBe("connect%23bwpm%40simplelogin.co")
  expect(hibpUsernameEncode("person name+tag@example.com")).toBe("person+name%2Btag%40example.com")
  expect(hibpUsernameEncode("é/お?~!*-. _")).toBe("%C3%A9%2F%E3%81%8A%3F%7E%21*-.+_")
})

test("hibpBreachUrlCreate preserves the upstream endpoint and query flags", () => {
  expect(hibpBreachUrlCreate("connect#bwpm@simplelogin.co")).toBe(
    "https://haveibeenpwned.com/api/v3/breachedaccount/connect%23bwpm%40simplelogin.co?truncateResponse=false&includeUnverified=false",
  )
})

test("hibpBreachSyntheticResponseCreate matches the Vaultwarden no-key response", () => {
  expect(hibpBreachSyntheticResponseCreate("connect#bwpm@simplelogin.co")).toEqual([
    {
      addedDate: "2019-08-18T00:00:00Z",
      breachDate: "2019-08-18T00:00:00Z",
      dataClasses: ["Error - No API key set!"],
      description:
        'Go to: <a href="https://haveibeenpwned.com/account/connect%23bwpm%40simplelogin.co" target="_blank" rel="noreferrer">https://haveibeenpwned.com/account/connect%23bwpm%40simplelogin.co</a> for a manual check.<br/><br/>HaveIBeenPwned API key not set!<br/>Go to <a href="https://haveibeenpwned.com/API/Key" target="_blank" rel="noreferrer">https://haveibeenpwned.com/API/Key</a> to purchase an API key from HaveIBeenPwned.<br/><br/>',
      domain: "haveibeenpwned.com",
      logoPath: "vw_static/hibp.png",
      name: "HaveIBeenPwned",
      pwnCount: 0,
      title: "Manual HIBP Check",
    },
  ])
})

test("hibpBreachGet returns the synthetic response and does not fetch without an API key", async () => {
  let fetchCount = 0
  const http: HibpHttpAdapter = {
    fetch: async () => {
      fetchCount += 1
      return new Response("unexpected")
    },
  }

  for (const apiKey of [undefined, null, "   "]) {
    const result = await hibpBreachGet("user@example.com", { apiKey, http })
    expect(result).toEqual({ success: true, data: hibpBreachSyntheticResponseCreate("user@example.com") })
  }
  expect(fetchCount).toBe(0)
})

test("hibpBreachGet trims the API key and sends the upstream request headers", async () => {
  const calls: Array<{ init?: RequestInit; url: string }> = []
  const body = [{ Name: "Example", Domain: "example.com" }]
  const http: HibpHttpAdapter = {
    fetch: async (url, init) => {
      calls.push({ init, url })
      return new Response(JSON.stringify(body), { status: 200 })
    },
  }

  const result = await hibpBreachGet("person name+tag@example.com", { apiKey: "  secret-key  ", http })

  expect(result).toEqual({ success: true, data: body })
  expect(calls).toEqual([
    {
      init: { headers: { "hibp-api-key": "secret-key", "user-agent": "Vaultwarden" }, method: "GET" },
      url: "https://haveibeenpwned.com/api/v3/breachedaccount/person+name%2Btag%40example.com?truncateResponse=false&includeUnverified=false",
    },
  ])
})

test("hibpBreachGet converts network and malformed JSON failures to unavailable results", async () => {
  const networkResult = await hibpBreachGet("user@example.com", {
    apiKey: "secret-key",
    http: {
      fetch: async () => {
        throw new Error("network failure")
      },
    },
  })
  expect(networkResult).toMatchObject({
    code: "platform.unavailable",
    errorMessage: "The HIBP request failed.",
    statusCode: 503,
    success: false,
  })

  const malformedResult = await hibpBreachGet("user@example.com", {
    apiKey: "secret-key",
    http: httpAdapterCreate(new Response("not-json", { status: 200 })),
  })
  expect(malformedResult).toMatchObject({
    code: "platform.unavailable",
    errorMessage: "The HIBP response was invalid.",
    statusCode: 503,
    success: false,
  })
})

test("hibpBreachGet preserves the upstream not-found distinction and maps other statuses to unavailable", async () => {
  const notFoundResult = await hibpBreachGet("user@example.com", {
    apiKey: "secret-key",
    http: httpAdapterCreate(new Response(null, { status: 404 })),
  })
  expect(notFoundResult).toMatchObject({
    code: "platform.not-found",
    errorMessage: "The HIBP account was not found.",
    statusCode: 404,
    success: false,
  })

  for (const status of [400, 401, 403, 429, 500]) {
    const result = await hibpBreachGet("user@example.com", {
      apiKey: "secret-key",
      http: httpAdapterCreate(new Response(null, { status })),
    })
    expect(result).toMatchObject({ code: "platform.unavailable", statusCode: 503, success: false })
  }
})

test("hibpBreachResponseCreate and hibpBreachNotFoundResponseCreate serialize JSON with compatibility headers", async () => {
  const response = hibpBreachResponseCreate({ status: "ok" }, 201)
  expect(response.status).toBe(201)
  expect(response.headers.get("content-type")).toBe("application/json; charset=UTF-8")
  expect(await response.json()).toEqual({ status: "ok" })

  const notFoundResponse = hibpBreachNotFoundResponseCreate()
  expect(notFoundResponse.status).toBe(404)
  expect(notFoundResponse.headers.get("content-type")).toBe("application/json; charset=UTF-8")
  expect(await notFoundResponse.json()).toEqual({})

  const undefinedResponse = hibpBreachResponseCreate(undefined)
  expect(await undefinedResponse.text()).toBe("null")
})
