import * as v from "valibot"
import type { Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionLoginFillDataSchema, type ExtensionLoginFillData } from "../fill/extensionLoginFillDataSchema.js"
import { extensionLoginFillInjected } from "../fill/extensionLoginFillInjected.js"
import { extensionCipherFillDataSchema, type ExtensionCipherFillData } from "../fill/extensionCipherFillDataSchema.js"
import { extensionCipherFillInjected } from "../fill/extensionCipherFillInjected.js"
import { extensionRuntimeResponseSchema } from "../messaging/extensionRuntimeResponseSchema.js"
import type { ExtensionScriptingAdapter } from "./extensionScriptingAdapter.js"

type ExtensionScriptInjection = {
  target: { tabId: number; frameIds?: number[] }
  func: typeof extensionLoginFillInjected
  args: [Parameters<typeof extensionLoginFillInjected>[0]]
}
type ExtensionCipherScriptInjection = {
  target: { tabId: number; frameIds?: number[] }
  func: typeof extensionCipherFillInjected
  args: [Parameters<typeof extensionCipherFillInjected>[0]]
}

type ExtensionScriptExecution = { frameId: number; result: unknown }

type ExtensionScriptingApi = {
  executeScript: (...args: never[]) => unknown
}

function unavailable<T>(op: string, message: string): Result<T> {
  return resultErrorCreate(op, message, { code: "platform.unavailable", statusCode: 503 })
}

function internal<T>(op: string, message: string): Result<T> {
  return resultErrorCreate(op, message, { code: "platform.internal", statusCode: 500 })
}

function extensionLoginFillDataRead(value: unknown): Result<ExtensionLoginFillData> {
  const op = "extensionScriptingAdapter.executeScript"
  const responseResult = v.safeParse(extensionRuntimeResponseSchema, value)
  if (!responseResult.success) return internal(op, "Injected fill response is invalid.")
  if (!responseResult.output.success) return responseResult.output
  const dataResult = v.safeParse(extensionLoginFillDataSchema, responseResult.output.data)
  if (!dataResult.success) return internal(op, "Injected fill result is invalid.")
  return resultCreate(dataResult.output)
}

function extensionCipherFillDataRead(value: unknown): Result<ExtensionCipherFillData> {
  const op = "extensionScriptingAdapter.cipherExecuteScript"
  const responseResult = v.safeParse(extensionRuntimeResponseSchema, value)
  if (!responseResult.success) return internal(op, "Injected fill response is invalid.")
  if (!responseResult.output.success) return responseResult.output
  const dataResult = v.safeParse(extensionCipherFillDataSchema, responseResult.output.data)
  if (!dataResult.success) return internal(op, "Injected fill result is invalid.")
  return resultCreate(dataResult.output)
}

export function extensionScriptingAdapterCreate(scripting: ExtensionScriptingApi): ExtensionScriptingAdapter {
  const executeScript: ExtensionScriptingAdapter["executeScript"] = async (target, credentials) => {
    const op = "extensionScriptingAdapter.executeScript"
    const injectionTarget =
      target.frameId === undefined ? { tabId: target.tabId } : { tabId: target.tabId, frameIds: [target.frameId] }
    let results: ExtensionScriptExecution[]
    try {
      const executeScript = scripting.executeScript as unknown as (
        injection: ExtensionScriptInjection,
      ) => Promise<ExtensionScriptExecution[]>
      results = await executeScript.call(scripting, {
        target: injectionTarget,
        func: extensionLoginFillInjected,
        args: [credentials],
      })
    } catch {
      return unavailable(op, "Active page could not be filled.")
    }

    if (!Array.isArray(results) || results.length !== 1) {
      return unavailable(op, "Active page did not return one fill result.")
    }
    const result = results[0]
    if (result === undefined) return unavailable(op, "Active page did not return a fill result.")
    return extensionLoginFillDataRead(result.result)
  }

  const cipherExecuteScript: ExtensionScriptingAdapter["cipherExecuteScript"] = async (target, values) => {
    const op = "extensionScriptingAdapter.cipherExecuteScript"
    const injectionTarget =
      target.frameId === undefined ? { tabId: target.tabId } : { tabId: target.tabId, frameIds: [target.frameId] }
    let results: ExtensionScriptExecution[]
    try {
      const executeScript = scripting.executeScript as unknown as (
        injection: ExtensionCipherScriptInjection,
      ) => Promise<ExtensionScriptExecution[]>
      results = await executeScript.call(scripting, {
        target: injectionTarget,
        func: extensionCipherFillInjected,
        args: [values],
      })
    } catch {
      return unavailable(op, "Active page could not be filled.")
    }
    if (!Array.isArray(results) || results.length !== 1 || results[0] === undefined) {
      return unavailable(op, "Active page did not return one fill result.")
    }
    return extensionCipherFillDataRead(results[0].result)
  }

  return { executeScript, cipherExecuteScript }
}
