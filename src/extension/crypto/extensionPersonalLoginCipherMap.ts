import { type Result } from "#result"
import type { BitwardenEncryptedLoginCipher } from "../../shared/api/bitwardenEncryptedLoginCipherSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import type { ExtensionPersonalLoginCipher } from "./extensionPersonalLoginCipherSchema.js"

type PersonalLoginCipher = ExtensionPersonalLoginCipher | BitwardenEncryptedLoginCipher
type StringMap = (value: string) => Promise<Result<string>>

async function optionalStringMap(
  value: string | null | undefined,
  map: StringMap,
): Promise<Result<string | null | undefined>> {
  if (value === null || value === undefined) return resultCreate(value)
  return map(value)
}

export async function extensionPersonalLoginCipherMap<Cipher extends PersonalLoginCipher>(
  cipher: Cipher,
  map: StringMap,
): Promise<Result<Cipher>> {
  const nameResult = await map(cipher.name)
  if (!nameResult.success) return nameResult
  const notesResult = await optionalStringMap(cipher.notes, map)
  if (!notesResult.success) return notesResult
  const usernameResult = await optionalStringMap(cipher.login.username, map)
  if (!usernameResult.success) return usernameResult
  const passwordResult = await optionalStringMap(cipher.login.password, map)
  if (!passwordResult.success) return passwordResult
  const totpResult = await optionalStringMap(cipher.login.totp, map)
  if (!totpResult.success) return totpResult

  const uris: Array<{ uri: string | null; match?: number | null }> = []
  for (const uri of cipher.login.uris) {
    const uriResult = await optionalStringMap(uri.uri, map)
    if (!uriResult.success) return uriResult
    uris.push({ ...uri, uri: uriResult.data as string | null })
  }

  const legacyUriResult =
    cipher.login.uri === undefined ? resultCreate(undefined) : await optionalStringMap(cipher.login.uri, map)
  if (!legacyUriResult.success) return legacyUriResult

  const fields: Array<{ name: string | null; value: string | null; type: number; linkedId: number | null }> = []
  for (const field of cipher.fields) {
    const fieldNameResult = await optionalStringMap(field.name, map)
    if (!fieldNameResult.success) return fieldNameResult
    const fieldValueResult = await optionalStringMap(field.value, map)
    if (!fieldValueResult.success) return fieldValueResult
    fields.push({
      ...field,
      name: fieldNameResult.data as string | null,
      value: fieldValueResult.data as string | null,
    })
  }

  const attachments: NonNullable<PersonalLoginCipher["attachments"]> | null | undefined =
    cipher.attachments === undefined || cipher.attachments === null ? cipher.attachments : []
  if (attachments !== undefined && attachments !== null) {
    for (const attachment of cipher.attachments ?? []) {
      const fileNameResult = await optionalStringMap(attachment.fileName, map)
      if (!fileNameResult.success) return fileNameResult
      const keyResult = await optionalStringMap(attachment.key, map)
      if (!keyResult.success) return keyResult
      attachments.push({
        ...attachment,
        fileName: fileNameResult.data as string,
        ...(attachment.key === undefined ? {} : { key: keyResult.data }),
      })
    }
  }

  const passwordHistory: NonNullable<PersonalLoginCipher["passwordHistory"]> | null | undefined =
    cipher.passwordHistory === undefined || cipher.passwordHistory === null ? cipher.passwordHistory : []
  if (passwordHistory !== undefined && passwordHistory !== null) {
    for (const entry of cipher.passwordHistory ?? []) {
      const passwordResult = await optionalStringMap(entry.password, map)
      if (!passwordResult.success) return passwordResult
      passwordHistory.push({ ...entry, password: passwordResult.data as string })
    }
  }

  return resultCreate({
    ...cipher,
    name: nameResult.data,
    notes: notesResult.data,
    login: {
      ...cipher.login,
      username: usernameResult.data as string | null,
      password: passwordResult.data as string | null,
      totp: totpResult.data as string | null,
      uris,
      ...(legacyUriResult.data === undefined ? {} : { uri: legacyUriResult.data }),
    },
    fields,
    ...(cipher.attachments === undefined ? {} : { attachments }),
    ...(cipher.passwordHistory === undefined ? {} : { passwordHistory }),
  } as Cipher)
}
