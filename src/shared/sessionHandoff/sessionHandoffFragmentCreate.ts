import { type Result } from "#result"
import { base64UrlEncode } from "../crypto/base64UrlEncode.js"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import { sessionHandoffRouteCreate } from "./sessionHandoffRouteCreate.js"
import type { SessionHandoffOperation } from "./sessionHandoffOperationSchema.js"

export function sessionHandoffFragmentCreate(
  webVaultOrigin: string,
  token: string,
  transferKey: Uint8Array,
  operation: SessionHandoffOperation,
  cipherId: string | null,
): Result<string> {
  const op = "sessionHandoffFragmentCreate"
  if (transferKey.byteLength !== 32) {
    return resultErrorCreate(op, "Session handoff transfer key is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  try {
    const url = new URL(sessionHandoffRouteCreate(operation, cipherId), webVaultOrigin)
    const fragment = JSON.stringify({
      version: 1,
      token,
      transferKey: base64UrlEncode(transferKey),
      operation,
      cipherId,
    })
    url.hash = `onewarden-handoff=${base64UrlEncode(new TextEncoder().encode(fragment))}`
    return resultCreate(url.toString())
  } catch {
    return resultErrorCreate(op, "Session handoff URL could not be created.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
}
