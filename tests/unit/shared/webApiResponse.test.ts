import { expect, test } from "bun:test"
import * as v from "valibot"
import { webApiAuthenticatedHeadersCreate } from "../../../src/shared/api/webApiAuthenticatedHeadersCreate.js"
import { webApiResponseEmptyParse } from "../../../src/shared/api/webApiResponseEmptyParse.js"
import { webApiResponseParse } from "../../../src/shared/api/webApiResponseParse.js"

const responseSchema = v.object({ value: v.string() })

test("web API helpers create authenticated headers and parse schema-aware responses", async () => {
  expect(webApiAuthenticatedHeadersCreate("access-token")).toEqual({
    Authorization: "Bearer access-token",
    Accept: "application/json",
  })
  expect(webApiAuthenticatedHeadersCreate("access-token", "application/json")).toEqual({
    Authorization: "Bearer access-token",
    "Content-Type": "application/json",
    Accept: "application/json",
  })

  const parsed = await webApiResponseParse(
    "webApiResponseParse",
    new Response(JSON.stringify({ value: "parsed" }), { status: 200 }),
    responseSchema,
  )
  expect(parsed).toEqual({ success: true, data: { value: "parsed" } })

  const invalid = await webApiResponseParse(
    "webApiResponseParse",
    new Response(JSON.stringify({ value: 42 }), { status: 200 }),
    responseSchema,
  )
  expect(invalid).toEqual({
    success: false,
    op: "webApiResponseParse",
    code: "platform.internal",
    errorMessage: "Server response did not match expected schema.",
    statusCode: 500,
  })

  const empty = await webApiResponseEmptyParse("webApiResponseEmptyParse", new Response(null, { status: 204 }))
  expect(empty).toEqual({ success: true, data: undefined })
})
