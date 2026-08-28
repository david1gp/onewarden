import type { ResultErr } from "#result"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"

export function cipherErrorCreate(op: string, message: string, detail?: string): ResultErr {
  return apiErrorCreate(op, "platform.invalid-request", message, detail === undefined ? undefined : { "": [detail] })
}
