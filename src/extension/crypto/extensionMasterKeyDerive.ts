import * as v from "valibot"
import { type Result } from "#result"
import { argon2id } from "hash-wasm"
import { passwordHashCreate } from "../../shared/crypto/passwordHashCreate.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionEmailSchema } from "../extensionEmailSchema.js"
import { extensionPasswordSchema } from "../extensionPasswordSchema.js"

const extensionMasterKeyDeriveRequestSchema = v.object({
  password: extensionPasswordSchema,
  email: extensionEmailSchema,
  kdfMetadata: v.looseObject({
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

const ARGON2_ITERATIONS_MIN = 1
const ARGON2_ITERATIONS_MAX = 10
const ARGON2_MEMORY_MIN_MB = 15
const ARGON2_MEMORY_MAX_MB = 1024
const ARGON2_PARALLELISM_MIN = 1
const ARGON2_PARALLELISM_MAX = 16
const MASTER_KEY_LENGTH_BYTES = 32

type Argon2Metadata = {
  iterations: number
  memory: number
  parallelism: number
}

function argon2MetadataValid(kdf: {
  iterations: number
  memory: number | null
  parallelism: number | null
}): kdf is Argon2Metadata {
  return (
    Number.isSafeInteger(kdf.iterations) &&
    kdf.iterations >= ARGON2_ITERATIONS_MIN &&
    kdf.iterations <= ARGON2_ITERATIONS_MAX &&
    kdf.memory !== null &&
    Number.isSafeInteger(kdf.memory) &&
    kdf.memory >= ARGON2_MEMORY_MIN_MB &&
    kdf.memory <= ARGON2_MEMORY_MAX_MB &&
    kdf.parallelism !== null &&
    Number.isSafeInteger(kdf.parallelism) &&
    kdf.parallelism >= ARGON2_PARALLELISM_MIN &&
    kdf.parallelism <= ARGON2_PARALLELISM_MAX
  )
}

async function argon2idDerive(password: string, salt: string, kdf: Argon2Metadata): Promise<Result<Uint8Array>> {
  const op = "extensionMasterKeyDerive"
  const passwordBytes = new TextEncoder().encode(password)
  const saltBytes = new TextEncoder().encode(salt)
  try {
    const derived = await argon2id({
      password: passwordBytes,
      salt: saltBytes,
      iterations: kdf.iterations,
      memorySize: kdf.memory * 1024,
      parallelism: kdf.parallelism,
      hashLength: MASTER_KEY_LENGTH_BYTES,
      outputType: "binary",
    })
    const result = resultCreate(new Uint8Array(derived))
    derived.fill(0)
    return result
  } catch {
    return resultErrorCreate(op, "Master key derivation failed.", { code: "platform.internal", statusCode: 500 })
  } finally {
    passwordBytes.fill(0)
    saltBytes.fill(0)
  }
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
  if (kdf.kdfType === 1) {
    if (!argon2MetadataValid(kdf)) return invalidResult(op, "Argon2id metadata is invalid.")
    return argon2idDerive(parsed.output.password, normalizedEmail, {
      iterations: kdf.iterations,
      memory: kdf.memory,
      parallelism: kdf.parallelism,
    })
  }
  if (kdf.kdfType !== 0 || kdf.memory !== null || kdf.parallelism !== null) {
    return unsupportedResult(op, "Only PBKDF2-SHA256 and Argon2id vaults are supported.")
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
