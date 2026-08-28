import * as v from "valibot"
import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

const extensionMasterPasswordHashDeriveRequestSchema = v.object({
  password: v.pipe(v.string(), v.minLength(1)),
})

export async function extensionMasterPasswordHashDerive(
  masterPassword: unknown,
  masterKey: unknown,
): Promise<Result<Uint8Array>> {
  const op = "extensionMasterPasswordHashDerive"
  const passwordResult = v.safeParse(extensionMasterPasswordHashDeriveRequestSchema, { password: masterPassword })
  if (!passwordResult.success) {
    return resultErrorCreate(op, "Master password hash request is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
      errorData: v.summarize(passwordResult.issues),
    })
  }
  if (!(masterKey instanceof Uint8Array) || masterKey.byteLength !== 32) {
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
        salt: new TextEncoder().encode(passwordResult.output.password),
        iterations: 1,
      },
      passwordKey,
      256,
    )
    return resultCreate(new Uint8Array(hash))
  } catch {
    return resultErrorCreate(op, "Master password hash derivation failed.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
}
