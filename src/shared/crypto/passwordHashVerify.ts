import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import { constantTimeBytesEqual } from "./constantTimeBytesEqual.js"
import { passwordHashCreate } from "./passwordHashCreate.js"

const PASSWORD_HASH_ITERATIONS_DEFAULT = 600_000

export async function passwordHashVerify(
  password: string,
  salt: Uint8Array,
  expectedHash: Uint8Array,
  iterations = PASSWORD_HASH_ITERATIONS_DEFAULT,
): Promise<Result<boolean>> {
  const op = "passwordHashVerify"
  const derivedHash = await passwordHashCreate(password, salt, iterations)
  if (!derivedHash.success) return resultErrorCreate(op, "Password hash verification failed.")
  return resultCreate(constantTimeBytesEqual(derivedHash.data, expectedHash))
}
