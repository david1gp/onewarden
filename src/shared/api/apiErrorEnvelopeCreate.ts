import { type ResultErr } from "#result"
import { apiErrorCatalog } from "./apiErrorCatalog.js"

function apiErrorValidationErrorsRead(error: ResultErr, message: string): Record<string, string[]> {
  if (error.code !== "platform.invalid-request" || error.errorData === undefined || error.errorData === null)
    return { "": [message] }

  try {
    const parsed: unknown = JSON.parse(error.errorData)
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return { "": [message] }

    const validationErrors: Record<string, string[]> = {}
    for (const [field, messages] of Object.entries(parsed)) {
      if (!Array.isArray(messages) || !messages.every((item) => typeof item === "string")) return { "": [message] }
      validationErrors[field] = messages
    }
    return Object.keys(validationErrors).length === 0 ? { "": [message] } : validationErrors
  } catch {
    return { "": [message] }
  }
}

export function apiErrorEnvelopeCreate(error: ResultErr) {
  const isKnownCode = error.code !== undefined && Object.hasOwn(apiErrorCatalog, error.code)
  const message = !isKnownCode ? "Internal server error." : error.errorMessage
  const validationErrors = apiErrorValidationErrorsRead(error, message)

  return {
    message,
    validationErrors,
    errorModel: { message, object: "error" },
    error: "",
    error_description: "",
    exceptionMessage: null,
    exceptionStackTrace: null,
    innerExceptionMessage: null,
    object: "error",
  }
}
