import { expect, test } from "bun:test"
import { cipherWireDataCreate } from "../../../src/server/contexts/ciphers/cipherWireDataCreate.js"
import { cipherWireDataParse } from "../../../src/server/contexts/ciphers/cipherWireDataParse.js"

test("cipher wire data round-trips opaque encrypted values", () => {
  const wireData = {
    name: "2.cipher-name",
    login: { username: "2.username", password: "2.password", uris: [{ uri: "2.uri" }] },
    fields: [{ name: "2.field", value: "2.value", type: 0, linkedId: null }],
  }
  const serializedResult = cipherWireDataCreate(wireData)
  expect(serializedResult).toEqual({ success: true, data: JSON.stringify(wireData) })
  if (!serializedResult.success) return
  expect(cipherWireDataParse(serializedResult.data)).toEqual({ success: true, data: wireData })
})

test("cipher wire data rejects malformed stored JSON", () => {
  expect(cipherWireDataParse("not-json")).toMatchObject({
    success: false,
    op: "cipherWireDataParse",
    errorMessage: "Cipher wire data is invalid.",
  })
})
