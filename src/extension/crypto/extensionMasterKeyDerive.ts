import * as v from "valibot"
import { type Result } from "#result"
import { passwordHashCreate } from "../../shared/crypto/passwordHashCreate.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

const extensionMasterKeyDeriveRequestSchema = v.object({
  password: v.pipe(v.string(), v.minLength(1)),
  email: v.pipe(v.string(), v.minLength(1)),
  kdfMetadata: v.object({
    kdfType: v.number(),
    iterations: v.number(),
    memory: v.nullable(v.number()),
    parallelism: v.nullable(v.number()),
  }),
})

function invalidResult<T>(op: string, message: string, errorData?: string): Result<T> {
  return resultErrorCreate(op, message, {
    code: "platform.invalid-request",
    statusCode: 400,
    errorData,
  })
}

function unsupportedResult<T>(op: string, message: string): Result<T> {
  return resultErrorCreate(op, message, { code: "extension.unsupported", statusCode: 400 })
}

export async function extensionMasterKeyDerive(
  password: unknown,
  email: unknown,
  kdfMetadata: unknown,
): Promise<Result<Uint8Array>> {
  const op = "extensionMasterKeyDerive"
  const parsed = v.safeParse(extensionMasterKeyDeriveRequestSchema, { password, email, kdfMetadata })
  if (!parsed.success) return invalidResult(op, "Master key derivation request is invalid.", v.summarize(parsed.issues))

  const normalizedEmail = parsed.output.email.trim().toLowerCase()
  if (normalizedEmail.length === 0) return invalidResult(op, "Account email is required.")

  const kdf = parsed.output.kdfMetadata
  if (kdf.kdfType !== 0 || kdf.memory !== null || kdf.parallelism !== null) {
    return unsupportedResult(op, "Only PBKDF2-SHA256 vaults are supported.")
  }
  if (!Number.isSafeInteger(kdf.iterations) || kdf.iterations < 1 || kdf.iterations > 0xffff_ffff) {
    return invalidResult(op, "PBKDF2 iteration metadata is invalid.")
  }

  const masterKeyResult = await passwordHashCreate(
    parsed.output.password,
    new TextEncoder().encode(normalizedEmail),
    kdf.iterations,
  )
  if (!masterKeyResult.success) {
    return resultErrorCreate(op, "Master key derivation failed.", { code: "platform.internal", statusCode: 500 })
  }
  return resultCreate(masterKeyResult.data)
}
