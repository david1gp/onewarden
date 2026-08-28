import { type Result } from "#result"
import type { Send } from "./send.js"
import { passwordHashCreate } from "../../../shared/crypto/passwordHashCreate.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"

const SEND_PASSWORD_ITERATIONS = 100_000

export async function sendPasswordSet(send: Send, password: string | null): Promise<Result<Send>> {
  if (password === null) {
    return resultCreate({
      ...send,
      passwordHash: null,
      passwordSalt: null,
      passwordIterations: null,
    })
  }
  const saltResult = secureRandomBytes(64)
  if (!saltResult.success) return saltResult
  const hashResult = await passwordHashCreate(password, saltResult.data, SEND_PASSWORD_ITERATIONS)
  if (!hashResult.success) return hashResult
  return resultCreate({
    ...send,
    passwordHash: hashResult.data,
    passwordSalt: saltResult.data,
    passwordIterations: SEND_PASSWORD_ITERATIONS,
  })
}
