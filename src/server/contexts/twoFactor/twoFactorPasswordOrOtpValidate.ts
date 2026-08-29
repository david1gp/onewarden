import { type Result } from "#result"
import { passwordHashVerify } from "../../../shared/crypto/passwordHashVerify.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { twoFactorProtectedActionValidate } from "./twoFactorProtectedActionValidate.js"

export type TwoFactorPasswordOrOtp = {
  masterPasswordHash?: string | null
  MasterPasswordHash?: string | null
  otp?: string | null
}

export async function twoFactorPasswordOrOtpValidate(
  database: DatabaseConnection,
  user: IdentityUser,
  data: TwoFactorPasswordOrOtp,
  clock: Parameters<typeof twoFactorProtectedActionValidate>[3],
  config: Pick<IdentityConfig, "EMAIL_ATTEMPTS_LIMIT" | "EMAIL_EXPIRATION_TIME">,
  deleteIfValid: boolean,
): Promise<Result<void>> {
  const password = data.masterPasswordHash ?? data.MasterPasswordHash
  if (password !== undefined && password !== null && (data.otp === undefined || data.otp === null)) {
    const passwordResult = await passwordHashVerify(password, user.salt, user.passwordHash, user.passwordIterations)
    if (!passwordResult.success) return passwordResult
    if (!passwordResult.data)
      return resultErrorCreate("twoFactorPasswordOrOtpValidate", "Invalid password", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    return { success: true, data: undefined }
  }
  if (data.otp !== undefined && data.otp !== null && (password === undefined || password === null))
    return twoFactorProtectedActionValidate(database, user.uuid, data.otp, clock, config, deleteIfValid)
  return resultErrorCreate("twoFactorPasswordOrOtpValidate", "No validation provided", {
    code: "platform.invalid-request",
    statusCode: 400,
  })
}
