import { expect, test } from "bun:test"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { loggerCreate } from "../../../src/shared/logging/loggerCreate.js"

test("loggerCreate emits structured entries at or above the configured level", () => {
  const entries: unknown[] = []
  const logger = loggerCreate({
    clock: clockTestCreate("2026-08-27T12:00:00.000Z"),
    level: "info",
    sink: (entry) => entries.push(entry),
  })

  logger.debug("ignored")
  logger.info("request.completed", { requestId: "request-1", status: 200 })
  logger.error("request.failed", { password: "do-not-log", nested: { accessToken: "also-do-not-log" } })

  expect(entries).toEqual([
    {
      timestamp: "2026-08-27T12:00:00.000Z",
      level: "info",
      message: "request.completed",
      fields: { requestId: "request-1", status: 200 },
    },
    {
      timestamp: "2026-08-27T12:00:00.000Z",
      level: "error",
      message: "request.failed",
      fields: { password: "[REDACTED]", nested: { accessToken: "[REDACTED]" } },
    },
  ])
})
