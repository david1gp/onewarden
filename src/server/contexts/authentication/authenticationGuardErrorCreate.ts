import type { ResultErr } from "#result"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export function authenticationGuardErrorCreate(op: string, message: string, statusCode = 401): ResultErr {
  const code =
    statusCode === 404 ? "platform.not-found" : statusCode === 403 ? "platform.forbidden" : "platform.unauthorized"
  return resultErrorCreate(op, message, { code, statusCode })
}
