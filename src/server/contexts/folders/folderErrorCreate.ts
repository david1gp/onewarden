import type { ResultErr } from "#result"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"

export function folderErrorCreate(op: string): ResultErr {
  return apiErrorCreate(op, "platform.invalid-request", "Invalid folder")
}
