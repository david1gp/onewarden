import { type ResultErr } from "#result"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export function identityDomainErrorCreate(op: string, message: string, statusCode = 400): ResultErr {
  const code = statusCode === 422 ? "identity.unprocessable" : "platform.invalid-request"
  return resultErrorCreate(op, message, { code, statusCode })
}
