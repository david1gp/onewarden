import { type Result } from "#result"
import { base64Encode } from "../../../shared/crypto/base64Encode.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export async function webAuthMasterPasswordHashDerive(
  masterPassword: string,
  masterKey: Uint8Array,
): Promise<Result<string>> {
  const op = "webAuthMasterPasswordHashDerive"
  if (masterPassword.length === 0) {
    return resultErrorCreate(op, "Master password cannot be empty.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  if (masterKey.byteLength !== 32) {
    return resultErrorCreate(op, "Master key must be 32 bytes.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  try {
    const passwordKey = await crypto.subtle.importKey("raw", new Uint8Array(masterKey), "PBKDF2", false, ["deriveBits"])
    const hash = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: new TextEncoder().encode(masterPassword),
        iterations: 1,
      },
      passwordKey,
      256,
    )
    return resultCreate(base64Encode(new Uint8Array(hash)))
  } catch {
    return resultErrorCreate(op, "Master password hash derivation failed.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
}
