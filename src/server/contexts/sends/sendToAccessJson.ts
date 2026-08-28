import { type Result } from "#result"
import type { DatabaseConnection } from "../../database/database.js"
import { identityUserFindByUuid } from "../identity/identityUserFindByUuid.js"
import type { Send } from "./send.js"

export function sendToAccessJson(database: DatabaseConnection, send: Send): Result<Record<string, unknown>> {
  const dataResult = sendDataAccessJsonParse(send.data)
  if (!dataResult.success) return dataResult
  let creatorIdentifier: string | null = null
  if (send.hideEmail !== true && send.userUuid !== null) {
    const userResult = identityUserFindByUuid(database, send.userUuid)
    if (!userResult.success) return userResult
    creatorIdentifier = userResult.data?.email ?? null
  }
  return {
    success: true,
    data: {
      id: send.uuid,
      type: send.type,
      name: send.name,
      text: send.type === 0 ? dataResult.data : null,
      file: send.type === 1 ? dataResult.data : null,
      expirationDate: send.expirationDate,
      creatorIdentifier,
      object: "send-access",
    },
  }
}

function sendDataAccessJsonParse(value: string): Result<Record<string, unknown>> {
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return { success: true, data: {} }
    const data: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(parsed as Record<string, unknown>)) {
      const normalizedKey = key.length === 0 ? key : `${key[0]?.toLowerCase() ?? ""}${key.slice(1)}`
      data[normalizedKey] = item
    }
    if (typeof data.size === "number" && Number.isSafeInteger(data.size)) data.size = String(data.size)
    return { success: true, data }
  } catch {
    return { success: true, data: {} }
  }
}
