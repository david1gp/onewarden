import { type Result } from "#result"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { CipherData } from "./cipherDataSchema.js"

const cipherTypeKeys = {
  1: "login",
  2: "secureNote",
  3: "card",
  4: "identity",
  5: "sshKey",
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function cipherJsonClean(value: unknown): unknown {
  if (!isRecord(value)) return value
  const cleaned = { ...value }
  delete cleaned.response
  const uris = cleaned.uris
  if (Array.isArray(uris)) cleaned.uris = uris.map(cipherJsonClean)
  return cleaned
}

function cipherJsonSerialize(value: unknown): string {
  return JSON.stringify(value) ?? "null"
}

export function cipherDataPrepare(data: CipherData): Result<{
  fields: string | null
  data: string
  passwordHistory: string | null
  folderUuid: string | null
  organizationUuid: string | null
  key: string | null
  name: string
  notes: string | null
  reprompt: number | null
  archivedDate: string | null | undefined
  favorite: boolean | null | undefined
}> {
  const typeKey = cipherTypeKeys[data.type as keyof typeof cipherTypeKeys]
  if (typeKey === undefined) return apiErrorCreate("cipherDataPrepare", "platform.invalid-request", "Invalid type")

  const typeData = data[typeKey]
  if (!isRecord(typeData)) return apiErrorCreate("cipherDataPrepare", "platform.invalid-request", "Data missing")

  const fields = data.fields === undefined ? null : cipherJsonSerialize(cipherJsonClean(data.fields))
  const passwordHistory =
    data.passwordHistory === undefined ? null : cipherJsonSerialize(cipherJsonClean(data.passwordHistory))
  const folderUuid =
    data.folderId === undefined || data.folderId === null || data.folderId === "" ? null : data.folderId
  const organizationUuid = data.organizationId ?? data.organizationID ?? null
  const reprompt = data.reprompt === 0 || data.reprompt === 1 ? data.reprompt : null

  return resultCreate({
    archivedDate: data.archivedDate,
    data: cipherJsonSerialize(cipherJsonClean(typeData)),
    favorite: data.favorite,
    fields,
    folderUuid,
    key: data.key ?? null,
    name: data.name,
    notes: data.notes ?? null,
    organizationUuid,
    passwordHistory,
    reprompt,
  })
}
