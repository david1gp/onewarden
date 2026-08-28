import { expect, test } from "bun:test"
import { clockCreate } from "../../../src/shared/clock/clockCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"

test("clockCreate reads the current time", () => {
  const clock = clockCreate()
  const before = Date.now()
  const value = clock.now().getTime()
  const after = Date.now()

  expect(value).toBeGreaterThanOrEqual(before)
  expect(value).toBeLessThanOrEqual(after)
})

test("clockTestCreate returns an independent deterministic date", () => {
  const clock = clockTestCreate("2026-08-27T12:00:00.000Z")
  const first = clock.now()
  first.setUTCFullYear(2030)

  expect(first.toISOString()).toBe("2030-08-27T12:00:00.000Z")
  expect(clock.now().toISOString()).toBe("2026-08-27T12:00:00.000Z")
})
