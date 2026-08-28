import type { ResultErr } from "#result"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export function sendErrorCreate(
  op: string,
  message: string,
  statusCode = 400,
  sendAccessErrorType?: string,
): ResultErr {
  if (sendAccessErrorType === undefined)
    return apiErrorCreate(
      op,
      statusCode === 401
        ? "platform.unauthorized"
        : statusCode === 403
          ? "platform.forbidden"
          : statusCode === 404
            ? "platform.not-found"
            : statusCode === 429
              ? "platform.rate-limited"
              : statusCode === 500
                ? "platform.internal"
                : "platform.invalid-request",
      message,
    )
  return resultErrorCreate(op, message, {
    code: statusCode === 404 ? "platform.not-found" : "platform.invalid-request",
    errorData: JSON.stringify({ sendAccessErrorType }),
    statusCode,
  })
}
