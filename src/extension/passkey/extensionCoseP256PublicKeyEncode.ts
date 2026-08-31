import { type Result } from "#result"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionCborEncode } from "./extensionCborEncode.js"

export function extensionCoseP256PublicKeyEncode(x: Uint8Array, y: Uint8Array): Result<Uint8Array> {
  const op = "extensionCoseP256PublicKeyEncode"
  if (x.byteLength !== 32 || y.byteLength !== 32)
    return resultErrorCreate(op, "P-256 public key coordinates must be 32 bytes.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  return extensionCborEncode(
    new Map<number, unknown>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, x],
      [-3, y],
    ]),
  )
}
