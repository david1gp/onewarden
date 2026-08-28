import { type ResultErr } from "#result"
import { apiErrorCatalog } from "./apiErrorCatalog.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"

export function apiErrorCreate(
  op: string,
  code: string,
  errorMessage: string,
  details?: Readonly<Record<string, readonly string[]>>,
): ResultErr {
  const isKnownCode = Object.hasOwn(apiErrorCatalog, code)
  const catalogEntry = isKnownCode
    ? apiErrorCatalog[code as keyof typeof apiErrorCatalog]
    : apiErrorCatalog["platform.internal"]
  const errorData = details === undefined ? undefined : JSON.stringify(details)
  return resultErrorCreate(op, isKnownCode ? errorMessage : "Internal server error.", {
    code: catalogEntry.code,
    errorData,
    statusCode: catalogEntry.httpStatus,
  })
}
