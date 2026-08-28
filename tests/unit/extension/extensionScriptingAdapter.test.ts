import { expect, test } from "bun:test"
import { extensionScriptingAdapterCreate } from "../../../src/extension/background/extensionScriptingAdapterCreate.js"

test("extensionScriptingAdapterCreate injects only into the requested tab/frame and parses the result", async () => {
  const calls: unknown[] = []
  const adapter = extensionScriptingAdapterCreate({
    executeScript: async (injection) => {
      calls.push(injection)
      return [
        {
          frameId: 5,
          result: { success: true, data: { status: "filled", usernameFilled: true, passwordFilled: true } },
        },
      ]
    },
  })

  const result = await adapter.executeScript(
    { tabId: 12, frameId: 5 },
    { username: "user@example.test", password: "secret" },
  )

  expect(result).toEqual({
    success: true,
    data: { status: "filled", usernameFilled: true, passwordFilled: true },
  })
  expect(calls).toHaveLength(1)
  expect(calls[0]).toMatchObject({
    target: { tabId: 12, frameIds: [5] },
    args: [{ username: "user@example.test", password: "secret" }],
  })
})

test("extensionScriptingAdapterCreate returns a safe error when execution is unavailable", async () => {
  const adapter = extensionScriptingAdapterCreate({
    executeScript: async () => {
      throw new Error("restricted page")
    },
  })

  const result = await adapter.executeScript({ tabId: 12 }, { username: "user@example.test", password: "secret" })

  expect(result).toMatchObject({
    success: false,
    op: "extensionScriptingAdapter.executeScript",
    code: "platform.unavailable",
    statusCode: 503,
  })
})
