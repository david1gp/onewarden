import { type Result } from "#result"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { Send } from "./send.js"
import { sendAccessIdCreate } from "./sendAccessIdCreate.js"

export function sendToJson(send: Send): Result<Record<string, unknown>> {
  const dataResult = sendDataJsonParse(send.data)
  if (!dataResult.success) return dataResult
  const password = send.passwordHash === null ? null : base64UrlEncode(send.passwordHash)
  return resultCreate({
    id: send.uuid,
    accessId: sendAccessIdCreate(send.uuid),
    type: send.type,
    name: send.name,
    notes: send.notes,
    text: send.type === 0 ? dataResult.data : null,
    file: send.type === 1 ? dataResult.data : null,
    key: send.key,
    maxAccessCount: send.maxAccessCount,
    accessCount: send.accessCount,
    password,
    authType: password === null ? 2 : 1,
    disabled: send.disabled,
    hideEmail: send.hideEmail ?? false,
    revisionDate: send.revisionDate,
    expirationDate: send.expirationDate,
    deletionDate: send.deletionDate,
    object: "send",
  })
}

function sendDataJsonParse(value: string): Result<Record<string, unknown>> {
  const op = "sendToJson"
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return resultCreate({})
    const data = sendDataJsonLowercase(parsed as Record<string, unknown>)
    const size = data.size
    if (typeof size === "number" && Number.isSafeInteger(size)) data.size = String(size)
    return resultCreate(data)
  } catch {
    return { success: false, op, errorMessage: "Send data could not be decoded." }
  }
}

function sendDataJsonLowercase(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = key.length === 0 ? key : `${key[0]?.toLowerCase() ?? ""}${key.slice(1)}`
    result[normalizedKey] = sendDataJsonValueLowercase(item)
  }
  return result
}

function sendDataJsonValueLowercase(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sendDataJsonValueLowercase)
  if (typeof value === "object" && value !== null) return sendDataJsonLowercase(value as Record<string, unknown>)
  return value
}
