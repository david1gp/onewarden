import * as v from "valibot"
import type { Result } from "#result"
import type { BitwardenEncryptedCipher } from "../../shared/api/bitwardenEncryptedCipherSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { type ExtensionCipher, extensionCipherSchema } from "./extensionCipherSchema.js"

type CipherMap = ExtensionCipher | BitwardenEncryptedCipher
type StringMap = (value: string) => Promise<Result<string>>

const cardStringFields = ["cardholderName", "brand", "number", "expMonth", "expYear", "code"] as const
const identityStringFields = [
  "title",
  "firstName",
  "middleName",
  "lastName",
  "address1",
  "address2",
  "address3",
  "city",
  "state",
  "postalCode",
  "country",
  "company",
  "email",
  "phone",
  "ssn",
  "username",
  "passportNumber",
  "licenseNumber",
] as const
const sshKeyStringFields = ["privateKey", "publicKey", "keyFingerprint"] as const

async function optionalStringMap(value: unknown, map: StringMap): Promise<Result<string | null | undefined>> {
  if (value === undefined || value === null) return resultCreate(value)
  if (typeof value !== "string") return resultCreate(value as never)
  return map(value)
}

async function recordStringFieldsMap(
  value: Record<string, unknown>,
  fields: readonly string[],
  map: StringMap,
): Promise<Result<Record<string, unknown>>> {
  const output = { ...value }
  for (const field of fields) {
    if (!(field in value)) continue
    const fieldResult = await optionalStringMap(value[field], map)
    if (!fieldResult.success) return fieldResult
    output[field] = fieldResult.data
  }
  return resultCreate(output)
}

async function fieldsMap(value: unknown, map: StringMap): Promise<Result<unknown>> {
  if (value === undefined || value === null) return resultCreate(value)
  if (!Array.isArray(value)) return resultCreate(value)
  const output: Record<string, unknown>[] = []
  for (const fieldValue of value) {
    if (typeof fieldValue !== "object" || fieldValue === null || Array.isArray(fieldValue)) {
      output.push(fieldValue as never)
      continue
    }
    const field = fieldValue as Record<string, unknown>
    const mapped = await recordStringFieldsMap(field, ["name", "value"], map)
    if (!mapped.success) return mapped
    output.push(mapped.data)
  }
  return resultCreate(output)
}

async function attachmentsMap(value: unknown, map: StringMap): Promise<Result<unknown>> {
  if (value === undefined || value === null) return resultCreate(value)
  if (!Array.isArray(value)) return resultCreate(value)
  const output: Record<string, unknown>[] = []
  for (const attachmentValue of value) {
    if (typeof attachmentValue !== "object" || attachmentValue === null || Array.isArray(attachmentValue)) {
      output.push(attachmentValue as never)
      continue
    }
    const attachment = attachmentValue as Record<string, unknown>
    const mapped = await recordStringFieldsMap(attachment, ["fileName", "key"], map)
    if (!mapped.success) return mapped
    output.push(mapped.data)
  }
  return resultCreate(output)
}

async function passwordHistoryMap(value: unknown, map: StringMap): Promise<Result<unknown>> {
  if (value === undefined || value === null) return resultCreate(value)
  if (!Array.isArray(value)) return resultCreate(value)
  const output: Record<string, unknown>[] = []
  for (const entryValue of value) {
    if (typeof entryValue !== "object" || entryValue === null || Array.isArray(entryValue)) {
      output.push(entryValue as never)
      continue
    }
    const entry = entryValue as Record<string, unknown>
    const mapped = await recordStringFieldsMap(entry, ["password"], map)
    if (!mapped.success) return mapped
    output.push(mapped.data)
  }
  return resultCreate(output)
}

async function typeDataMap(value: unknown, fields: readonly string[], map: StringMap): Promise<Result<unknown>> {
  if (value === undefined || value === null) return resultCreate(value)
  if (typeof value !== "object" || Array.isArray(value)) return resultCreate(value)
  return recordStringFieldsMap(value as Record<string, unknown>, fields, map)
}

export async function extensionCipherMap<Cipher extends CipherMap>(
  cipher: Cipher,
  map: StringMap,
): Promise<Result<Cipher>> {
  const nameResult = await optionalStringMap(cipher.name, map)
  if (!nameResult.success) return nameResult
  const notesResult = await optionalStringMap(cipher.notes, map)
  if (!notesResult.success) return notesResult
  const fieldsResult = await fieldsMap(cipher.fields, map)
  if (!fieldsResult.success) return fieldsResult
  const attachmentsResult = await attachmentsMap(cipher.attachments, map)
  if (!attachmentsResult.success) return attachmentsResult
  const passwordHistoryResult = await passwordHistoryMap(cipher.passwordHistory, map)
  if (!passwordHistoryResult.success) return passwordHistoryResult

  const output: Record<string, unknown> = {
    ...(cipher as unknown as Record<string, unknown>),
    name: nameResult.data,
    notes: notesResult.data,
    fields: fieldsResult.data,
    ...(cipher.attachments === undefined ? {} : { attachments: attachmentsResult.data }),
    ...(cipher.passwordHistory === undefined ? {} : { passwordHistory: passwordHistoryResult.data }),
  }

  if (cipher.type === 3) {
    const cardResult = await typeDataMap(cipher.card, cardStringFields, map)
    if (!cardResult.success) return cardResult
    output.card = cardResult.data
  }
  if (cipher.type === 4) {
    const identityResult = await typeDataMap(cipher.identity, identityStringFields, map)
    if (!identityResult.success) return identityResult
    output.identity = identityResult.data
  }
  if (cipher.type === 5) {
    const sshKeyResult = await typeDataMap(cipher.sshKey, sshKeyStringFields, map)
    if (!sshKeyResult.success) return sshKeyResult
    output.sshKey = sshKeyResult.data
  }

  const parsed = v.safeParse(extensionCipherSchema, output)
  if (!parsed.success) return resultCreate(output as Cipher)
  return resultCreate(parsed.output as Cipher)
}
