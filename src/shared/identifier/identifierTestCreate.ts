import type { Identifier } from "./identifier.js"

export function identifierTestCreate(values: readonly string[] = ["00000000-0000-4000-8000-000000000000"]): Identifier {
  let index = 0
  return {
    uuid: () => {
      const value = values[Math.min(index, values.length - 1)]
      index += 1
      return value ?? "00000000-0000-4000-8000-000000000000"
    },
  }
}
