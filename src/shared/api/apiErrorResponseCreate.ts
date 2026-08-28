import { type ResultErr } from "#result"
import { apiErrorCatalog } from "./apiErrorCatalog.js"
import { apiErrorEnvelopeCreate } from "./apiErrorEnvelopeCreate.js"

export function apiErrorResponseCreate(error: ResultErr): Response {
  const catalogEntry =
    error.code !== undefined && Object.hasOwn(apiErrorCatalog, error.code)
      ? apiErrorCatalog[error.code as keyof typeof apiErrorCatalog]
      : apiErrorCatalog["platform.internal"]
  const envelope = apiErrorEnvelopeCreate(error)
  return new Response(JSON.stringify(envelope), {
    headers: { "content-type": "application/json; charset=UTF-8" },
    status: catalogEntry.httpStatus,
  })
}
