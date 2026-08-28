export const apiErrorCatalog = {
  "platform.invalid-request": { code: "platform.invalid-request", httpStatus: 400, retryable: false },
  "platform.unauthorized": { code: "platform.unauthorized", httpStatus: 401, retryable: false },
  "platform.forbidden": { code: "platform.forbidden", httpStatus: 403, retryable: false },
  "platform.not-found": { code: "platform.not-found", httpStatus: 404, retryable: false },
  "platform.conflict": { code: "platform.conflict", httpStatus: 409, retryable: false },
  "platform.rate-limited": { code: "platform.rate-limited", httpStatus: 429, retryable: true },
  "platform.internal": { code: "platform.internal", httpStatus: 500, retryable: false },
  "platform.unavailable": { code: "platform.unavailable", httpStatus: 503, retryable: true },
  "identity.unprocessable": { code: "identity.unprocessable", httpStatus: 422, retryable: false },
} as const
