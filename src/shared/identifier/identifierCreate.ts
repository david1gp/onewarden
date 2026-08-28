import type { Identifier } from "./identifier.js"

export function identifierCreate(): Identifier {
  return { uuid: () => crypto.randomUUID() }
}
