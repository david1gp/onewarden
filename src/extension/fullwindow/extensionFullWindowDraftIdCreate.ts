let fallbackCounter = 0

/** Stable identifier for a create draft or one of its custom field rows. */
export function extensionFullWindowDraftIdCreate(): string {
  const uuid = globalThis.crypto?.randomUUID
  if (uuid !== undefined) return globalThis.crypto.randomUUID()
  fallbackCounter += 1
  return `draft-${fallbackCounter}`
}
