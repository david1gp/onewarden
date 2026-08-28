import { expect, test } from "bun:test"
import { environmentLoad } from "../../src/server/config/environmentLoad.js"

test("environmentLoad applies the local server defaults", () => {
  const result = environmentLoad({})

  expect(result).toEqual({
    success: true,
    data: {
      HOST: "127.0.0.1",
      PORT: 3000,
    },
  })
})

test("environmentLoad rejects an invalid port", () => {
  const result = environmentLoad({ PORT: "not-a-port" })

  expect(result.success).toBe(false)
  expect(result).toMatchObject({
    op: "environmentLoad",
    success: false,
  })
})
