import { type Result } from "#result"
import type { Send } from "./send.js"
import { passwordHashVerify } from "../../../shared/crypto/passwordHashVerify.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"

export async function sendPasswordVerify(send: Send, password: string): Promise<Result<boolean>> {
  if (send.passwordHash === null || send.passwordSalt === null || send.passwordIterations === null)
    return resultCreate(false)
  const result = await passwordHashVerify(password, send.passwordSalt, send.passwordHash, send.passwordIterations)
  if (!result.success) return result
  return resultCreate(result.data)
}
