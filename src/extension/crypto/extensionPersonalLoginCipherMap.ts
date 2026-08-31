import { type Result } from "#result"
import type { BitwardenEncryptedLoginCipher } from "../../shared/api/bitwardenEncryptedLoginCipherSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import type { ExtensionPersonalLoginCipher } from "./extensionPersonalLoginCipherSchema.js"

type PersonalLoginCipher = ExtensionPersonalLoginCipher | BitwardenEncryptedLoginCipher
type StringMap = (value: string) => Promise<Result<string>>

async function nullableStringMap(value: string | null, map: StringMap): Promise<Result<string | null>> {
  if (value === null) return resultCreate(null)
  return map(value)
}

export async function extensionPersonalLoginCipherMap<Cipher extends PersonalLoginCipher>(
  cipher: Cipher,
  map: StringMap,
): Promise<Result<Cipher>> {
  const nameResult = await map(cipher.name)
  if (!nameResult.success) return nameResult
  const notesResult = await nullableStringMap(cipher.notes, map)
  if (!notesResult.success) return notesResult
  const usernameResult = await nullableStringMap(cipher.login.username, map)
  if (!usernameResult.success) return usernameResult
  const passwordResult = await nullableStringMap(cipher.login.password, map)
  if (!passwordResult.success) return passwordResult
  const totpResult = await nullableStringMap(cipher.login.totp, map)
  if (!totpResult.success) return totpResult

  const uris: Array<{ uri: string | null; match?: number | null }> = []
  for (const uri of cipher.login.uris) {
    const uriResult = await nullableStringMap(uri.uri, map)
    if (!uriResult.success) return uriResult
    uris.push({ ...uri, uri: uriResult.data })
  }

  const legacyUriResult =
    cipher.login.uri === undefined ? resultCreate(undefined) : await nullableStringMap(cipher.login.uri, map)
  if (!legacyUriResult.success) return legacyUriResult

  const fields: Array<{ name: string | null; value: string | null; type: number; linkedId: number | null }> = []
  for (const field of cipher.fields) {
    const fieldNameResult = await nullableStringMap(field.name, map)
    if (!fieldNameResult.success) return fieldNameResult
    const fieldValueResult = await nullableStringMap(field.value, map)
    if (!fieldValueResult.success) return fieldValueResult
    fields.push({ ...field, name: fieldNameResult.data, value: fieldValueResult.data })
  }

  return resultCreate({
    ...cipher,
    name: nameResult.data,
    notes: notesResult.data,
    login: {
      ...cipher.login,
      username: usernameResult.data,
      password: passwordResult.data,
      totp: totpResult.data,
      uris,
      ...(legacyUriResult.data === undefined ? {} : { uri: legacyUriResult.data }),
    },
    fields,
  } as Cipher)
}
