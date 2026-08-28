import { createResult, type ResultOk } from "#result"

export function resultCreate<T>(data: T): ResultOk<T> {
  return createResult(data)
}
