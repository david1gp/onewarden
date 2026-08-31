import { argon2id } from "hash-wasm"
import { type Result } from "#result"
import { hkdfSha256Expand } from "./hkdfSha256Expand.js"
import { passwordHashCreate } from "./passwordHashCreate.js"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"

const PBKDF2_KDF_TYPE = 0
const ARGON2ID_KDF_TYPE = 1
const PBKDF2_ITERATIONS_MIN = 100_000
const PBKDF2_ITERATIONS_MAX = 2_000_000
const ARGON2_ITERATIONS_MIN = 1
const ARGON2_ITERATIONS_MAX = 10
const ARGON2_MEMORY_MIN_MB = 15
const ARGON2_MEMORY_MAX_MB = 1024
const ARGON2_PARALLELISM_MIN = 1
const ARGON2_PARALLELISM_MAX = 16
const DERIVED_KEY_LENGTH = 32
const STRETCHED_KEY_LENGTH = 64

type PortableKdfOptions = {
  kdfType: number
  iterations: number
  memory?: number
  parallelism?: number
}

function invalidKdfResult(message: string): Result<void> {
  return resultErrorCreate("bitwardenPortableEncryptionKeyDerive", message, {
    code: "platform.invalid-request",
    statusCode: 400,
  })
}

function kdfOptionsValid(options: PortableKdfOptions): Result<void> {
  if (!Number.isSafeInteger(options.kdfType)) return invalidKdfResult("Bitwarden portable export KDF type is invalid.")

  if (options.kdfType === PBKDF2_KDF_TYPE) {
    if (options.memory !== undefined || options.parallelism !== undefined) {
      return invalidKdfResult("PBKDF2 portable export must not include Argon2 parameters.")
    }
    if (
      !Number.isSafeInteger(options.iterations) ||
      options.iterations < PBKDF2_ITERATIONS_MIN ||
      options.iterations > PBKDF2_ITERATIONS_MAX
    ) {
      return invalidKdfResult(
        `PBKDF2 portable export iterations must be between ${PBKDF2_ITERATIONS_MIN} and ${PBKDF2_ITERATIONS_MAX}.`,
      )
    }
    return resultCreate(undefined)
  }

  if (options.kdfType !== ARGON2ID_KDF_TYPE) {
    return resultErrorCreate(
      "bitwardenPortableEncryptionKeyDerive",
      `Unsupported Bitwarden portable export KDF type ${options.kdfType}.`,
      { code: "platform.unsupported", statusCode: 400 },
    )
  }

  if (options.memory === undefined || options.parallelism === undefined) {
    return invalidKdfResult("Argon2id portable export memory and parallelism parameters are required.")
  }
  const memory = options.memory
  const parallelism = options.parallelism
  if (
    !Number.isSafeInteger(options.iterations) ||
    options.iterations < ARGON2_ITERATIONS_MIN ||
    options.iterations > ARGON2_ITERATIONS_MAX
  ) {
    return invalidKdfResult(
      `Argon2id portable export iterations must be between ${ARGON2_ITERATIONS_MIN} and ${ARGON2_ITERATIONS_MAX}.`,
    )
  }
  if (!Number.isSafeInteger(memory) || memory < ARGON2_MEMORY_MIN_MB || memory > ARGON2_MEMORY_MAX_MB) {
    return invalidKdfResult(
      `Argon2id portable export memory must be between ${ARGON2_MEMORY_MIN_MB} MB and ${ARGON2_MEMORY_MAX_MB} MB.`,
    )
  }
  if (
    !Number.isSafeInteger(parallelism) ||
    parallelism < ARGON2_PARALLELISM_MIN ||
    parallelism > ARGON2_PARALLELISM_MAX
  ) {
    return invalidKdfResult(
      `Argon2id portable export parallelism must be between ${ARGON2_PARALLELISM_MIN} and ${ARGON2_PARALLELISM_MAX}.`,
    )
  }
  if (memory * 1024 < 8 * parallelism) {
    return invalidKdfResult("Argon2id portable export memory is too small for the requested parallelism.")
  }
  return resultCreate(undefined)
}

async function kdfMaterialDerive(
  password: string,
  salt: string,
  options: PortableKdfOptions,
): Promise<Result<Uint8Array>> {
  // Bitwarden stores the random salt as Base64 and derives from the encoded field value.
  if (options.kdfType === PBKDF2_KDF_TYPE) {
    return passwordHashCreate(password, new TextEncoder().encode(salt), options.iterations)
  }

  const passwordBytes = new TextEncoder().encode(password)
  const saltBytes = new TextEncoder().encode(salt)
  try {
    const derived = await argon2id({
      password: passwordBytes,
      salt: saltBytes,
      iterations: options.iterations,
      memorySize: (options.memory ?? 0) * 1024,
      parallelism: options.parallelism ?? 0,
      hashLength: DERIVED_KEY_LENGTH,
      outputType: "binary",
    })
    return resultCreate(new Uint8Array(derived))
  } catch {
    return resultErrorCreate("bitwardenPortableEncryptionKeyDerive", "Portable export key derivation failed.", {
      code: "platform.internal",
      statusCode: 500,
    })
  } finally {
    passwordBytes.fill(0)
    saltBytes.fill(0)
  }
}

export async function bitwardenPortableEncryptionKeyDerive(
  password: string,
  salt: string,
  options: PortableKdfOptions,
): Promise<Result<Uint8Array>> {
  const op = "bitwardenPortableEncryptionKeyDerive"
  if (typeof password !== "string" || password.length === 0) {
    return resultErrorCreate(op, "Portable export password cannot be empty.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  if (typeof salt !== "string" || salt.length === 0) {
    return resultErrorCreate(op, "Portable export salt is required.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  if (options === null || typeof options !== "object") {
    return resultErrorCreate(op, "Portable export KDF parameters are required.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const kdfValidation = kdfOptionsValid(options)
  if (!kdfValidation.success) return kdfValidation

  const materialResult = await kdfMaterialDerive(password, salt, options)
  if (!materialResult.success) return materialResult

  const encryptionKeyResult = await hkdfSha256Expand(materialResult.data, new TextEncoder().encode("enc"), 32)
  if (!encryptionKeyResult.success) {
    materialResult.data.fill(0)
    return resultErrorCreate(op, "Portable export key stretching failed.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
  const authenticationKeyResult = await hkdfSha256Expand(materialResult.data, new TextEncoder().encode("mac"), 32)
  if (!authenticationKeyResult.success) {
    materialResult.data.fill(0)
    encryptionKeyResult.data.fill(0)
    return resultErrorCreate(op, "Portable export key stretching failed.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }

  const stretchedKey = new Uint8Array(STRETCHED_KEY_LENGTH)
  stretchedKey.set(encryptionKeyResult.data)
  stretchedKey.set(authenticationKeyResult.data, 32)
  materialResult.data.fill(0)
  encryptionKeyResult.data.fill(0)
  authenticationKeyResult.data.fill(0)
  return resultCreate(stretchedKey)
}
