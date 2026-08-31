import { expect, test } from "bun:test"
import { webSessionHandoffApiClientCreate } from "../../../src/web/sessionHandoffs/model/webSessionHandoffApiClientCreate.js"

const request = { operation: "create" as const, cipherId: null, deviceIdentifier: "web-device" }

test("web session handoff API client rejects invalid JSON and schema-invalid responses", async () => {
  let responseBody = "not-json"
  const client = webSessionHandoffApiClientCreate({
    fetch: async () => new Response(responseBody, { status: 200 }),
  })

  const invalidJson = await client.consume("handoff-token", request)
  expect(invalidJson).toMatchObject({ success: false, code: "platform.internal", statusCode: 500 })

  responseBody = JSON.stringify({ operation: "create", cipherId: null })
  const invalidSchema = await client.consume("handoff-token", request)
  expect(invalidSchema).toMatchObject({ success: false, code: "platform.internal", statusCode: 500 })
})
