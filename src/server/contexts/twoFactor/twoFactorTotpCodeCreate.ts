import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { twoFactorBase32Decode } from "./twoFactorBase32Decode.js"

export async function twoFactorTotpCodeCreate(secret: string, timeStep: number): Promise<Result<string>> {
  const op = "twoFactorTotpCodeCreate"
  const secretResult = twoFactorBase32Decode(secret)
  if (!secretResult.success) return secretResult
  if (!Number.isSafeInteger(timeStep) || timeStep < 0) return resultErrorCreate(op, "Invalid TOTP time step.")

  const counter = new Uint8Array(8)
  let value = timeStep
  for (let index = counter.length - 1; index >= 0; index -= 1) {
    counter[index] = value & 0xff
    value = Math.floor(value / 256)
  }
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      secretResult.data.buffer as ArrayBuffer,
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"],
    )
    const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, counter.buffer as ArrayBuffer))
    const offset = (digest[digest.length - 1] ?? 0) & 0x0f
    const binary =
      (((digest[offset] ?? 0) & 0x7f) << 24) |
      (((digest[offset + 1] ?? 0) & 0xff) << 16) |
      (((digest[offset + 2] ?? 0) & 0xff) << 8) |
      ((digest[offset + 3] ?? 0) & 0xff)
    return resultCreate(String(binary % 1_000_000).padStart(6, "0"))
  } catch {
    return resultErrorCreate(op, "TOTP code generation failed.")
  }
}
