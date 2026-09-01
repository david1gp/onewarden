import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

type StringMap = (value: string) => Promise<Result<string>>
type CredentialMap = (value: unknown) => Promise<Result<unknown>>

const loginStringKeys = ["username", "password", "totp"] as const
const cardStringKeys = ["cardholderName", "brand", "number", "expMonth", "expYear", "code"] as const
const identityStringKeys = [
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

function recordIs(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function invalidValue(message: string): Result<never> {
  return resultErrorCreate("organizationCipherMap", message, {
    code: "platform.invalid-request",
    statusCode: 400,
  })
}

async function stringValueMap(
  value: unknown,
  map: StringMap,
  label: string,
  required = false,
): Promise<Result<unknown>> {
  if (value === null || value === undefined) {
    if (required) return invalidValue(`${label} must be a string.`)
    return resultCreate(value)
  }
  if (typeof value !== "string") return invalidValue(`${label} must be a string.`)
  return map(value)
}

async function recordStringValuesMap(
  value: unknown,
  keys: readonly string[],
  map: StringMap,
  label: string,
): Promise<Result<unknown>> {
  if (value === null || value === undefined) return resultCreate(value)
  if (!recordIs(value)) return invalidValue(`${label} must be an object.`)
  const output = { ...value }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) continue
    const mapped = await stringValueMap(value[key], map, `${label}.${key}`)
    if (!mapped.success) return mapped
    output[key] = mapped.data
  }
  return resultCreate(output)
}

async function urisMap(value: unknown, map: StringMap, label: string): Promise<Result<unknown>> {
  if (value === null || value === undefined) return resultCreate(value)
  if (!Array.isArray(value)) return invalidValue(`${label} must be an array.`)
  const output: unknown[] = []
  for (const [index, entry] of value.entries()) {
    if (!recordIs(entry)) return invalidValue(`${label}[${index}] must be an object.`)
    const uri = await stringValueMap(entry.uri, map, `${label}[${index}].uri`, true)
    if (!uri.success) return uri
    output.push({ ...entry, uri: uri.data })
  }
  return resultCreate(output)
}

async function fieldsMap(value: unknown, map: StringMap): Promise<Result<unknown>> {
  if (value === null || value === undefined) return resultCreate(value)
  if (!Array.isArray(value)) return invalidValue("fields must be an array.")
  const output: unknown[] = []
  for (const [index, entry] of value.entries()) {
    if (!recordIs(entry)) return invalidValue(`fields[${index}] must be an object.`)
    const name = Object.hasOwn(entry, "name")
      ? await stringValueMap(entry.name, map, `fields[${index}].name`)
      : resultCreate(undefined)
    if (!name.success) return name
    const fieldValue = Object.hasOwn(entry, "value")
      ? await stringValueMap(entry.value, map, `fields[${index}].value`)
      : resultCreate(undefined)
    if (!fieldValue.success) return fieldValue
    output.push({
      ...entry,
      ...(Object.hasOwn(entry, "name") ? { name: name.data } : {}),
      ...(Object.hasOwn(entry, "value") ? { value: fieldValue.data } : {}),
    })
  }
  return resultCreate(output)
}

async function passwordHistoryMap(value: unknown, map: StringMap): Promise<Result<unknown>> {
  if (value === null || value === undefined) return resultCreate(value)
  if (!Array.isArray(value)) return invalidValue("passwordHistory must be an array.")
  const output: unknown[] = []
  for (const [index, entry] of value.entries()) {
    if (!recordIs(entry)) return invalidValue(`passwordHistory[${index}] must be an object.`)
    const password = await stringValueMap(entry.password, map, `passwordHistory[${index}].password`, true)
    if (!password.success) return password
    output.push({ ...entry, password: password.data })
  }
  return resultCreate(output)
}

async function loginMap(
  value: unknown,
  map: StringMap,
  credentialMap: CredentialMap | undefined,
): Promise<Result<unknown>> {
  if (value === null || value === undefined) return resultCreate(value)
  if (!recordIs(value)) return invalidValue("login must be an object.")
  const stringValues = await recordStringValuesMap(value, loginStringKeys, map, "login")
  if (!stringValues.success) return stringValues
  const output = stringValues.data as Record<string, unknown>

  if (Object.hasOwn(value, "uri")) {
    const uri = await stringValueMap(value.uri, map, "login.uri")
    if (!uri.success) return uri
    output.uri = uri.data
  }
  if (Object.hasOwn(value, "uris")) {
    const uris = await urisMap(value.uris, map, "login.uris")
    if (!uris.success) return uris
    output.uris = uris.data
  }
  if (Object.hasOwn(value, "fido2Credentials")) {
    if (value.fido2Credentials === null || value.fido2Credentials === undefined) {
      output.fido2Credentials = value.fido2Credentials
    } else {
      if (!Array.isArray(value.fido2Credentials)) return invalidValue("login.fido2Credentials must be an array.")
      if (credentialMap === undefined) return invalidValue("login.fido2Credentials cannot be mapped.")
      const credentials: unknown[] = []
      for (const [index, credential] of value.fido2Credentials.entries()) {
        if (!recordIs(credential)) return invalidValue(`login.fido2Credentials[${index}] must be an object.`)
        const mapped = await credentialMap(credential)
        if (!mapped.success) return mapped
        credentials.push(mapped.data)
      }
      output.fido2Credentials = credentials
    }
  }
  return resultCreate(output)
}

export async function organizationCipherMap(
  cipher: Record<string, unknown>,
  map: StringMap,
  credentialMap?: CredentialMap,
): Promise<Result<Record<string, unknown>>> {
  const name = await stringValueMap(cipher.name, map, "name", true)
  if (!name.success) return name
  const output: Record<string, unknown> = { ...cipher, name: name.data }

  if (Object.hasOwn(cipher, "notes")) {
    const notes = await stringValueMap(cipher.notes, map, "notes")
    if (!notes.success) return notes
    output.notes = notes.data
  }

  if (Object.hasOwn(cipher, "fields")) {
    const fields = await fieldsMap(cipher.fields, map)
    if (!fields.success) return fields
    output.fields = fields.data
  }

  if (Object.hasOwn(cipher, "passwordHistory")) {
    const passwordHistory = await passwordHistoryMap(cipher.passwordHistory, map)
    if (!passwordHistory.success) return passwordHistory
    output.passwordHistory = passwordHistory.data
  }

  if (Object.hasOwn(cipher, "login")) {
    const login = await loginMap(cipher.login, map, credentialMap)
    if (!login.success) return login
    output.login = login.data
  }

  const typeDataKeys: Record<number, { key: "card" | "identity" | "secureNote"; stringKeys: readonly string[] }> = {
    2: { key: "secureNote", stringKeys: [] },
    3: { key: "card", stringKeys: cardStringKeys },
    4: { key: "identity", stringKeys: identityStringKeys },
  }
  const typeData = typeDataKeys[cipher.type as number]
  if (typeData !== undefined && Object.hasOwn(cipher, typeData.key)) {
    const mapped = await recordStringValuesMap(cipher[typeData.key], typeData.stringKeys, map, typeData.key)
    if (!mapped.success) return mapped
    output[typeData.key] = mapped.data
  }

  return resultCreate(output)
}
