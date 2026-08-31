import type { SessionHandoffOperation } from "./sessionHandoffOperationSchema.js"

export function sessionHandoffAdditionalDataCreate(
  operation: SessionHandoffOperation,
  cipherId: string | null,
): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(`onewarden-session-handoff-v1\u0000${operation}\u0000${cipherId ?? ""}`)
  const bytes = new Uint8Array(new ArrayBuffer(encoded.byteLength))
  bytes.set(encoded)
  return bytes
}
