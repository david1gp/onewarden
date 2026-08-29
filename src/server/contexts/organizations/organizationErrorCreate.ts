import type { ResultErr } from "#result"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export function organizationErrorCreate(op: string, message: string, statusCode = 400): ResultErr {
  const code =
    statusCode === 404
      ? "platform.not-found"
      : statusCode === 403
        ? "platform.forbidden"
        : statusCode === 401
          ? "platform.unauthorized"
          : "platform.invalid-request"
  return resultErrorCreate(op, message, { code, statusCode })
}
