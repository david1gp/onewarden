import * as v from "valibot"
import { type Result } from "#result"
import { passwordHashCreate } from "../../../shared/crypto/passwordHashCreate.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

const webAuthKdfMetadataSchema = v.object({
  kdfType: v.number(),
  iterations: v.number(),
  memory: v.nullable(v.number()),
  parallelism: v.nullable(v.number()),
})

export type WebAuthKdfMetadata = v.InferOutput<typeof webAuthKdfMetadataSchema>

export async function webAuthMasterKeyDerive(
  password: string,
  email: string,
  kdfMetadata: WebAuthKdfMetadata,
): Promise<Result<Uint8Array>> {
  const op = "webAuthMasterKeyDerive"
  if (password.length === 0) {
    return resultErrorCreate(op, "Password cannot be empty.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail.length === 0) {
    return resultErrorCreate(op, "Email cannot be empty.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  if (kdfMetadata.kdfType !== 0 || kdfMetadata.memory !== null || kdfMetadata.parallelism !== null) {
    return resultErrorCreate(op, "Only PBKDF2-SHA256 vaults are supported.", {
      code: "platform.unsupported",
      statusCode: 400,
    })
  }
  if (
    !Number.isSafeInteger(kdfMetadata.iterations) ||
    kdfMetadata.iterations < 1 ||
    kdfMetadata.iterations > 0xffff_ffff
  ) {
    return resultErrorCreate(op, "PBKDF2 iteration metadata is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const masterKeyResult = await passwordHashCreate(
    password,
    new TextEncoder().encode(normalizedEmail),
    kdfMetadata.iterations,
  )
  if (!masterKeyResult.success) {
    return resultErrorCreate(op, "Master key derivation failed.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
  return resultCreate(masterKeyResult.data)
}
