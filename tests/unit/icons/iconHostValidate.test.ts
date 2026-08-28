import { expect, test } from "bun:test"
import { iconHostValidate } from "../../../src/server/contexts/icons/iconHostValidate.js"

test("iconHostValidate normalizes domain and IP hosts", () => {
  expect(iconHostValidate("Example.COM")).toEqual({ success: true, data: "example.com" })
  expect(iconHostValidate("bücher.example")).toEqual({ success: true, data: "xn--bcher-kva.example" })
  expect(iconHostValidate("[2001:db8::1]")).toEqual({ success: true, data: "2001:db8::1" })
})

test("iconHostValidate rejects malformed path hosts", () => {
  expect(iconHostValidate("example.com:443").success).toBe(false)
  expect(iconHostValidate("bad..example.com").success).toBe(false)
  expect(iconHostValidate("-bad.example").success).toBe(false)
  expect(iconHostValidate("example.com/path").success).toBe(false)
})
