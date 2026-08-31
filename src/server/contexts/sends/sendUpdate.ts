import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { Send } from "./send.js"
import { sendDataNumberResolve } from "./sendDataNumberResolve.js"
import { sendDataValueSerialize } from "./sendDataValueSerialize.js"
import type { SendData } from "./sendDataSchema.js"
import { sendFindByUuidAndUser } from "./sendFindByUuidAndUser.js"
import { sendPasswordSet } from "./sendPasswordSet.js"
import { sendRecipientVerificationDelete } from "./sendRecipientVerificationDelete.js"
import { sendRecipientsNormalize } from "./sendRecipientsNormalize.js"
import { sendSave } from "./sendSave.js"
import { sendUserRevisionUpdate } from "./sendUserRevisionUpdate.js"

export async function sendUpdate(
  database: DatabaseConnection,
  uuid: string,
  userUuid: string,
  data: SendData,
  clock: Clock,
): Promise<Result<Send>> {
  const existingResult = sendFindByUuidAndUser(database, uuid, userUuid)
  if (!existingResult.success) return existingResult
  if (existingResult.data === null) return resultErrorCreate("sendUpdate", "Send not found.")
  const existing = existingResult.data
  if (existing.type !== data.type) return resultErrorCreate("sendUpdate", "Sends can't change type.")
  const deletionTimestamp = Date.parse(data.deletionDate)
  if (!Number.isFinite(deletionTimestamp)) return resultErrorCreate("sendUpdate", "Send deletion date is invalid.")
  if (deletionTimestamp > clock.now().getTime() + 31 * 24 * 60 * 60 * 1_000)
    return resultErrorCreate(
      "sendUpdate",
      "You cannot have a Send with a deletion date that far into the future. Adjust the Deletion Date to a value less than 31 days from now and try again.",
    )
  const maxAccessCountResult = sendDataNumberResolve(data.maxAccessCount)
  if (!maxAccessCountResult.success) return maxAccessCountResult
  const recipientsResult = sendRecipientsNormalize(data.emails)
  if (!recipientsResult.success) return recipientsResult
  const expirationTimestamp =
    data.expirationDate === undefined || data.expirationDate === null ? null : Date.parse(data.expirationDate)
  if (expirationTimestamp !== null && !Number.isFinite(expirationTimestamp))
    return resultErrorCreate("sendUpdate", "Send expiration date is invalid.")
  let serialized = existing.data
  if (data.type === 0) {
    const serializedResult = sendDataValueSerialize(data.text)
    if (!serializedResult.success) return serializedResult
    serialized = serializedResult.data
  }
  let next = {
    ...existing,
    name: data.name,
    notes: data.notes ?? null,
    key: data.key,
    data: serialized,
    maxAccessCount: maxAccessCountResult.data,
    expirationDate: expirationTimestamp === null ? null : new Date(expirationTimestamp).toISOString(),
    deletionDate: new Date(deletionTimestamp).toISOString(),
    disabled: data.disabled,
    hideEmail: data.hideEmail ?? null,
    emails: recipientsResult.data,
    revisionDate: clock.now().toISOString(),
  }
  if (next.emails !== null) {
    next = { ...next, passwordHash: null, passwordSalt: null, passwordIterations: null }
  } else if (data.password !== undefined && data.password !== null) {
    const passwordResult = await sendPasswordSet(next, data.password)
    if (!passwordResult.success) return passwordResult
    next = passwordResult.data
  }
  return databaseTransaction(database, () => {
    const revisionResult = sendUserRevisionUpdate(database, userUuid, next.revisionDate)
    if (!revisionResult.success) return revisionResult
    const verificationDeleteResult = sendRecipientVerificationDelete(database, next.uuid)
    if (!verificationDeleteResult.success) return verificationDeleteResult
    const saveResult = sendSave(database, next)
    if (!saveResult.success) return saveResult
    return resultCreate(next)
  })
}
