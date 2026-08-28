import * as v from "valibot"
import type { Result } from "#result"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import type { ExtensionRuntimeMessage } from "./extensionRuntimeMessageSchema.js"
import { extensionRuntimeResponseSchema } from "./extensionRuntimeResponseSchema.js"

type ExtensionRuntimeGlobal = {
  runtime?: {
    sendMessage: (message: ExtensionRuntimeMessage) => Promise<unknown>
  }
}

/** Sends a typed runtime message to the background worker and returns the Result response. */
export async function extensionRuntimeMessageSend<T = unknown>(message: ExtensionRuntimeMessage): Promise<Result<T>> {
  const op = "extensionRuntimeMessageSend"
  const extensionChrome = (globalThis as typeof globalThis & { chrome?: ExtensionRuntimeGlobal }).chrome
  const runtime = extensionChrome?.runtime
  if (runtime === undefined) {
    return resultErrorCreate(op, "Chrome extension runtime is unavailable.")
  }

  try {
    const response = await runtime.sendMessage(message)
    const parsed = v.safeParse(extensionRuntimeResponseSchema, response)
    if (!parsed.success) {
      return resultErrorCreate(op, "Invalid runtime response received.")
    }
    return parsed.output as Result<T>
  } catch (err) {
    return resultErrorCreate(op, "Runtime message sending failed.", {
      errorData: err instanceof Error ? err.message : String(err),
    })
  }
}
