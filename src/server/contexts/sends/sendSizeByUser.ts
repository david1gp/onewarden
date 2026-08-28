import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { sendFindByUser } from "./sendFindByUser.js"

export function sendSizeByUser(database: DatabaseConnection, userUuid: string): Result<number> {
  const sendsResult = sendFindByUser(database, userUuid)
  if (!sendsResult.success) return sendsResult
  let total = 0
  for (const send of sendsResult.data) {
    if (send.type !== 1) continue
    let value: unknown
    try {
      value = JSON.parse(send.data)
    } catch {
      continue
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) continue
    const sizeValue = (value as Record<string, unknown>).size
    const size =
      typeof sizeValue === "number" ? sizeValue : typeof sizeValue === "string" ? Number(sizeValue) : Number.NaN
    if (!Number.isSafeInteger(size) || size < 0) continue
    total += size
    if (!Number.isSafeInteger(total)) return resultErrorCreate("sendSizeByUser", "Send size overflow.")
  }
  return resultCreate(total)
}
