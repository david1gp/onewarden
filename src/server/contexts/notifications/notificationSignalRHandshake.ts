const recordSeparator = "\u001e"
const handshakeResponse = Uint8Array.from([0x7b, 0x7d, 0x1e])

export function notificationSignalRHandshake(message: string): Uint8Array | undefined {
  const value = message.endsWith(recordSeparator) ? message.slice(0, -1) : message
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return undefined
  }
  if (!isHandshake(parsed)) return undefined
  return handshakeResponse.slice()
}

function isHandshake(value: unknown): value is { protocol: string; version: number } {
  if (typeof value !== "object" || value === null) return false
  const record = value as Record<string, unknown>
  return record.protocol === "messagepack" && record.version === 1
}
