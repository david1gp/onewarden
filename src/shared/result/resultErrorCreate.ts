import { createResultError, createResultErrorCode, type ResultErr } from "#result"

export function resultErrorCreate(
  op: string,
  errorMessage: string,
  options?: { code?: string; errorData?: string | null; statusCode?: number },
): ResultErr {
  const result =
    options?.code === undefined
      ? createResultError(op, errorMessage, options?.errorData)
      : createResultErrorCode(op, errorMessage, options.code)
  const resultWithData =
    options?.errorData !== undefined && options?.code !== undefined
      ? { ...result, errorData: options.errorData }
      : result
  if (options?.statusCode === undefined) return resultWithData
  return { ...resultWithData, statusCode: options.statusCode }
}
