import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityMailAdapter } from "../identity/identityMailAdapter.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { twoFactorEmailTokenCreate } from "./twoFactorEmailTokenCreate.js"
import type { TwoFactorEmailData } from "./twoFactorEmailData.js"
import { twoFactorEmailDataSchema } from "./twoFactorEmailDataSchema.js"
import { twoFactorEmailTokenInvalidate } from "./twoFactorEmailTokenInvalidate.js"
import { twoFactorPersistedJsonParse } from "./twoFactorPersistedJsonParse.js"
import { twoFactorProviderType } from "./twoFactorProviderType.js"
import { twoFactorRecordFindByUserAndType } from "./twoFactorRecordFindByUserAndType.js"
import { twoFactorRecordSave } from "./twoFactorRecordSave.js"

export async function twoFactorEmailTokenSend(
  database: DatabaseConnection,
  user: IdentityUser,
  clock: Clock,
  config: Pick<IdentityConfig, "EMAIL_TOKEN_SIZE">,
  mail: IdentityMailAdapter,
): Promise<Result<void>> {
  const recordResult = twoFactorRecordFindByUserAndType(database, user.uuid, twoFactorProviderType.email)
  if (!recordResult.success) return recordResult
  const record = recordResult.data
  if (record === null) return resultErrorCreate("twoFactorEmailTokenSend", "Two factor not found")
  const emailDataResult = twoFactorPersistedJsonParse(
    "twoFactorEmailTokenSend",
    record.data,
    twoFactorEmailDataSchema,
    "Could not decode EmailTokenData from string",
  )
  if (!emailDataResult.success) return emailDataResult
  const emailData: TwoFactorEmailData = emailDataResult.data
  const tokenResult = twoFactorEmailTokenCreate(config.EMAIL_TOKEN_SIZE ?? 6)
  if (!tokenResult.success) return tokenResult
  emailData.last_token = tokenResult.data
  emailData.token_sent = Math.floor(clock.now().getTime() / 1_000)
  emailData.attempts = 0
  record.data = JSON.stringify(emailData)
  const expectedData = record.data
  const saveResult = twoFactorRecordSave(database, record)
  if (!saveResult.success) return saveResult
  let sendResult: Result<void> | undefined
  try {
    sendResult =
      mail.sendTwoFactorToken === undefined
        ? resultErrorCreate("twoFactorEmailTokenSend", "Two-factor token email failed.")
        : await mail.sendTwoFactorToken(emailData.email, tokenResult.data)
  } catch {
    const invalidateResult = twoFactorEmailTokenInvalidate(
      database,
      record.userUuid,
      record.type,
      expectedData,
      JSON.stringify({ ...emailData, last_token: null, attempts: 0 }),
    )
    if (!invalidateResult.success) return invalidateResult
    return resultErrorCreate("twoFactorEmailTokenSend", "Two-factor token email failed.")
  }
  if (sendResult !== undefined && !sendResult.success) {
    const invalidateResult = twoFactorEmailTokenInvalidate(
      database,
      record.userUuid,
      record.type,
      expectedData,
      JSON.stringify({ ...emailData, last_token: null, attempts: 0 }),
    )
    if (!invalidateResult.success) return invalidateResult
    return sendResult
  }
  return resultCreate(undefined)
}
