import { expect, test } from "bun:test"
import * as v from "valibot"
import { requestValidationParse } from "../../../src/shared/validation/requestValidationParse.js"

const requestSchema = v.object({ name: v.pipe(v.string(), v.minLength(2)) })

test("requestValidationParse returns transformed valid input", () => {
  const result = requestValidationParse("requestBodyParse", { name: "Alice" }, requestSchema)

  expect(result).toEqual({ success: true, data: { name: "Alice" } })
})

test("requestValidationParse returns validation details instead of throwing", () => {
  const result = requestValidationParse("requestBodyParse", { name: "" }, requestSchema)

  expect(result.success).toBe(false)
  expect(result).toMatchObject({
    op: "requestBodyParse",
    code: "platform.invalid-request",
    statusCode: 400,
  })
  if (result.success) return
  expect(JSON.parse(result.errorData ?? "{}")).toHaveProperty("name")
})
