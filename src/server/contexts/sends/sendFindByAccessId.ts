import { type Result } from "#result"
import { base64UrlDecode } from "../../../shared/crypto/base64UrlDecode.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Send } from "./send.js"
import { sendFindByUuid } from "./sendFindByUuid.js"

export function sendFindByAccessId(database: DatabaseConnection, accessId: string): Result<Send | null> {
  const decodedResult = base64UrlDecode(accessId)
  if (!decodedResult.success) return resultCreate(null)
  const decoded = decodedResult.data
  const uuid = decoded.length === 16 ? sendUuidFromBytes(decoded) : new TextDecoder().decode(decoded)
  if (uuid === "") return resultCreate(null)
  return sendFindByUuid(database, uuid)
}

function sendUuidFromBytes(bytes: Uint8Array): string {
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
