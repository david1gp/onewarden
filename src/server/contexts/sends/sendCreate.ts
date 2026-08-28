import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { DatabaseConnection } from "../../database/database.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { Send } from "./send.js"
import { sendDataNumberResolve } from "./sendDataNumberResolve.js"
import { sendDataValueSerialize } from "./sendDataValueSerialize.js"
import type { SendData } from "./sendDataSchema.js"
import { sendPasswordSet } from "./sendPasswordSet.js"
import { sendSave } from "./sendSave.js"
import { sendUserRevisionUpdate } from "./sendUserRevisionUpdate.js"

type SendFileMetadata = { id: string; size: number; sizeName: string }

export async function sendCreate(
  database: DatabaseConnection,
  userUuid: string,
  data: SendData,
  clock: Clock,
  identifier: Identifier,
  fileMetadata?: SendFileMetadata,
): Promise<Result<Send>> {
  const now = clock.now().toISOString()
  const preparedResult = sendDataPrepare(data, clock, fileMetadata)
  if (!preparedResult.success) return preparedResult
  const passwordResult = await sendPasswordSet(
    {
      uuid: identifier.uuid(),
      userUuid,
      organizationUuid: null,
      name: data.name,
      notes: data.notes ?? null,
      type: data.type,
      data: preparedResult.data.serialized,
      key: data.key,
      passwordHash: null,
      passwordSalt: null,
      passwordIterations: null,
      maxAccessCount: preparedResult.data.maxAccessCount,
      accessCount: 0,
      creationDate: now,
      revisionDate: now,
      expirationDate: preparedResult.data.expirationDate,
      deletionDate: preparedResult.data.deletionDate,
      disabled: data.disabled,
      hideEmail: data.hideEmail ?? null,
    },
    data.password ?? null,
  )
  if (!passwordResult.success) return passwordResult
  const send = passwordResult.data
  const saveResult = databaseTransaction(database, () => {
    const revisionResult = sendUserRevisionUpdate(database, userUuid, now)
    if (!revisionResult.success) return revisionResult
    const result = sendSave(database, send)
    if (!result.success) return result
    return resultCreate(send)
  })
  return saveResult
}

function sendDataPrepare(
  data: SendData,
  clock: Clock,
  fileMetadata: SendFileMetadata | undefined,
): Result<{
  deletionDate: string
  expirationDate: string | null
  maxAccessCount: number | null
  serialized: string
}> {
  const maxAccessCountResult = sendDataNumberResolve(data.maxAccessCount)
  if (!maxAccessCountResult.success) return maxAccessCountResult
  const deletionTimestamp = Date.parse(data.deletionDate)
  const nowTimestamp = clock.now().getTime()
  if (!Number.isFinite(deletionTimestamp)) return resultErrorCreate("sendCreate", "Send deletion date is invalid.")
  if (deletionTimestamp > nowTimestamp + 31 * 24 * 60 * 60 * 1_000)
    return resultErrorCreate(
      "sendCreate",
      "You cannot have a Send with a deletion date that far into the future. Adjust the Deletion Date to a value less than 31 days from now and try again.",
    )
  const expirationTimestamp =
    data.expirationDate === undefined || data.expirationDate === null ? null : Date.parse(data.expirationDate)
  if (expirationTimestamp !== null && !Number.isFinite(expirationTimestamp))
    return resultErrorCreate("sendCreate", "Send expiration date is invalid.")
  const value = data.type === 0 ? data.text : data.file
  const serializedResult = sendDataValueSerialize(value)
  if (!serializedResult.success) return serializedResult
  if (fileMetadata === undefined)
    return resultCreate({
      deletionDate: new Date(deletionTimestamp).toISOString(),
      expirationDate: expirationTimestamp === null ? null : new Date(expirationTimestamp).toISOString(),
      maxAccessCount: maxAccessCountResult.data,
      serialized: serializedResult.data,
    })
  let parsed: unknown
  try {
    parsed = JSON.parse(serializedResult.data)
  } catch {
    return resultErrorCreate("sendCreate", "Send file data could not be decoded.")
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return resultErrorCreate("sendCreate", "Send file data is invalid.")
  const fileData = {
    ...(parsed as Record<string, unknown>),
    id: fileMetadata.id,
    size: fileMetadata.size,
    sizeName: fileMetadata.sizeName,
  }
  return resultCreate({
    deletionDate: new Date(deletionTimestamp).toISOString(),
    expirationDate: expirationTimestamp === null ? null : new Date(expirationTimestamp).toISOString(),
    maxAccessCount: maxAccessCountResult.data,
    serialized: JSON.stringify(fileData),
  })
}
