import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import type { ResultErr } from "#result"

export function folderErrorCreate(op: string): ResultErr {
  return apiErrorCreate(op, "platform.invalid-request", "Invalid folder")
}
