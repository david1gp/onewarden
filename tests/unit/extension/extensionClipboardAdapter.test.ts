import { expect, test } from "bun:test"
import { extensionClipboardAdapterCreate } from "../../../src/extension/clipboard/extensionClipboardAdapterCreate.js"

test("extensionClipboardAdapter writes text using provided clipboard target", async () => {
  let copied = ""
  const adapter = extensionClipboardAdapterCreate({
    writeText: async (text: string) => {
      copied = text
    },
  })

  const result = await adapter.copyText("secret-password")
  expect(result.success).toBe(true)
  expect(copied).toBe("secret-password")
})

test("extensionClipboardAdapter returns error when clipboard API is unavailable", async () => {
  const adapter = extensionClipboardAdapterCreate(null)

  const result = await adapter.copyText("secret-password")
  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.op).toBe("extensionClipboardAdapter.copyText")
    expect(result.errorMessage).toBe("Clipboard API is not available.")
  }
})

test("extensionClipboardAdapter returns error when writeText rejects", async () => {
  const adapter = extensionClipboardAdapterCreate({
    writeText: async () => {
      throw new Error("Permission denied")
    },
  })

  const result = await adapter.copyText("secret-password")
  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.op).toBe("extensionClipboardAdapter.copyText")
    expect(result.errorMessage).toBe("Clipboard write failed.")
    expect(result.errorData).toBe("Permission denied")
  }
})
