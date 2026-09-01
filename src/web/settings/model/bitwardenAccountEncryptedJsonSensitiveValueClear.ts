export function bitwardenAccountEncryptedJsonSensitiveValueClear(value: unknown): void {
  const visited = new Set<object>()

  const clear = (current: unknown): void => {
    if (current === null || typeof current !== "object") return
    if (visited.has(current)) return
    visited.add(current)

    if (current instanceof Uint8Array) {
      current.fill(0)
      return
    }

    if (Array.isArray(current)) {
      for (let index = 0; index < current.length; index += 1) {
        const entry = current[index]
        if (typeof entry === "string") {
          current[index] = ""
        } else {
          clear(entry)
        }
      }
      return
    }

    const record = current as Record<string, unknown>
    for (const key of Object.keys(record)) {
      const entry = record[key]
      if (typeof entry === "string") {
        record[key] = ""
      } else {
        clear(entry)
      }
    }
  }

  clear(value)
}
