import type { Result } from "#result"
import { extensionCipherKeyResolve } from "../../../extension/crypto/extensionCipherKeyResolve.js"
import { extensionEncStringDecryptText } from "../../../extension/crypto/extensionEncStringDecryptText.js"
import { extensionFido2CredentialDecrypt } from "../../../extension/crypto/extensionFido2CredentialDecrypt.js"
import type { BitwardenEncryptedFido2Credential } from "../../../shared/api/bitwardenEncryptedFido2CredentialSchema.js"
import type { BitwardenEncryptedLoginCipher } from "../../../shared/api/bitwardenEncryptedLoginCipherSchema.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { organizationApiClientCreate } from "../api/organizationApiClientCreate.js"
import { bitwardenOrganizationJsonFormat } from "./bitwardenOrganizationJsonFormat.js"
import { bitwardenOrganizationJsonPayloadValidate } from "./bitwardenOrganizationJsonPayloadValidate.js"
import { organizationCipherMap } from "./organizationCipherMap.js"

export interface BitwardenOrganizationJsonExportExecuteOptions {
  apiClient?: ReturnType<typeof organizationApiClientCreate>
  organizationId: string
  organizationKey?: Uint8Array | null
  session: ReturnType<typeof webAuthSessionCreate>
}

export interface BitwardenOrganizationJsonExportResult {
  content: string
  filename: string
  mimeType: string
}

function recordIs(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function organizationKeyValidate(key: Uint8Array | null | undefined): Result<Uint8Array> {
  if (!(key instanceof Uint8Array) || key.byteLength !== 64)
    return resultErrorCreate("bitwardenOrganizationJsonExportExecute", "Organization key is unavailable.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  return resultCreate(key)
}

function collectionExportCreate(
  value: Record<string, unknown>,
  organizationId: string,
): Result<Record<string, unknown>> {
  const id = value.id
  if (typeof id !== "string" || id.length === 0)
    return resultErrorCreate(
      "bitwardenOrganizationJsonExportExecute",
      "Organization export contains an invalid collection id.",
      {
        code: "platform.invalid-request",
        statusCode: 400,
      },
    )
  if (typeof value.name !== "string")
    return resultErrorCreate("bitwardenOrganizationJsonExportExecute", `Organization collection '${id}' has no name.`, {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  if (value.organizationId !== undefined && value.organizationId !== null && value.organizationId !== organizationId)
    return resultErrorCreate(
      "bitwardenOrganizationJsonExportExecute",
      `Organization collection '${id}' belongs to a different organization.`,
      { code: "platform.invalid-request", statusCode: 400 },
    )

  return resultCreate({
    defaultUserCollectionEmail: value.defaultUserCollectionEmail ?? null,
    externalId: value.externalId ?? null,
    id,
    name: value.name,
    object: "collection",
    organizationId,
    type: 0,
  })
}

function cipherCollectionIdsRead(
  cipher: Record<string, unknown>,
  collectionIds: ReadonlySet<string>,
  index: number,
): Result<string[]> {
  if (!Array.isArray(cipher.collectionIds) || cipher.collectionIds.length === 0)
    return resultErrorCreate(
      "bitwardenOrganizationJsonExportExecute",
      `Organization cipher at index ${index} does not reference a collection.`,
      { code: "platform.invalid-request", statusCode: 400 },
    )
  const ids: string[] = []
  for (const collectionId of cipher.collectionIds) {
    if (typeof collectionId !== "string" || collectionId.length === 0 || !collectionIds.has(collectionId))
      return resultErrorCreate(
        "bitwardenOrganizationJsonExportExecute",
        `Organization cipher at index ${index} references a missing collection.`,
        { code: "platform.invalid-request", statusCode: 400 },
      )
    if (ids.includes(collectionId))
      return resultErrorCreate(
        "bitwardenOrganizationJsonExportExecute",
        `Organization cipher at index ${index} contains a duplicate collection reference.`,
        { code: "platform.invalid-request", statusCode: 400 },
      )
    ids.push(collectionId)
  }
  return resultCreate(ids)
}

function itemDataRead(mappedCipher: Record<string, unknown>, type: number): Record<string, unknown> | null {
  const typeKey = type === 1 ? "login" : type === 2 ? "secureNote" : type === 3 ? "card" : "identity"
  const value = mappedCipher[typeKey]
  return recordIs(value) ? value : null
}

export async function bitwardenOrganizationJsonExportExecute(
  options: BitwardenOrganizationJsonExportExecuteOptions,
): Promise<Result<BitwardenOrganizationJsonExportResult>> {
  const op = "bitwardenOrganizationJsonExportExecute"
  const currentSession = options.session.session()
  if (currentSession === null) {
    return resultErrorCreate(op, "You must be logged in to export organization data.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }
  if (options.organizationId.length === 0) {
    return resultErrorCreate(op, "Organization id must not be empty.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const organizationKeyResult = organizationKeyValidate(options.organizationKey)
  if (!organizationKeyResult.success) return organizationKeyResult
  const organizationKey = organizationKeyResult.data

  const client = options.apiClient ?? organizationApiClientCreate({ token: () => currentSession.accessToken })
  const exportResult = await client.organizationExport(options.organizationId)
  if (!exportResult.success) return exportResult

  const collectionValues: Record<string, unknown>[] = []
  const collectionIds = new Set<string>()
  for (const value of exportResult.data.collections) {
    if (!recordIs(value))
      return resultErrorCreate(op, "Organization export contains an invalid collection.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    const collectionResult = collectionExportCreate(value, options.organizationId)
    if (!collectionResult.success) return collectionResult
    const id = collectionResult.data.id as string
    if (collectionIds.has(id))
      return resultErrorCreate(op, `Organization export contains duplicate collection id '${id}'.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    collectionIds.add(id)
    collectionValues.push(collectionResult.data)
  }

  const items: Record<string, unknown>[] = []
  for (const [index, value] of exportResult.data.ciphers.entries()) {
    if (!recordIs(value))
      return resultErrorCreate(op, `Organization export contains an invalid cipher at index ${index}.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    if (value.deletedDate !== undefined && value.deletedDate !== null) continue
    const type = value.type
    if (type !== 1 && type !== 2 && type !== 3 && type !== 4)
      return resultErrorCreate(op, `Bitwarden organization export does not support cipher type ${String(type)}.`, {
        code: "platform.unsupported",
        statusCode: 400,
      })
    if (
      value.organizationId !== undefined &&
      value.organizationId !== null &&
      value.organizationId !== options.organizationId
    )
      return resultErrorCreate(op, `Organization cipher at index ${index} belongs to a different organization.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    const itemCollectionIdsResult = cipherCollectionIdsRead(value, collectionIds, index)
    if (!itemCollectionIdsResult.success) return itemCollectionIdsResult

    const cipherKeyResult = await extensionCipherKeyResolve(
      { ...value, organizationId: options.organizationId } as unknown as BitwardenEncryptedLoginCipher,
      organizationKey,
      new Map([[options.organizationId, organizationKey]]),
    )
    if (!cipherKeyResult.success) return cipherKeyResult

    const decryptedResult = await organizationCipherMap(
      value,
      (encrypted) => extensionEncStringDecryptText(encrypted, cipherKeyResult.data),
      (credential) =>
        extensionFido2CredentialDecrypt(credential as BitwardenEncryptedFido2Credential, cipherKeyResult.data),
    )
    if (!decryptedResult.success) return decryptedResult
    const itemData = itemDataRead(decryptedResult.data, type)
    if (itemData === null)
      return resultErrorCreate(op, `Organization cipher at index ${index} has no type-specific data.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })

    const item: Record<string, unknown> = {
      collectionIds: itemCollectionIdsResult.data,
      creationDate: value.creationDate ?? null,
      deletedDate: value.deletedDate ?? null,
      fields: decryptedResult.data.fields ?? [],
      id: typeof value.id === "string" ? value.id : null,
      identity: type === 4 ? itemData : null,
      login: type === 1 ? itemData : null,
      name: decryptedResult.data.name,
      notes: decryptedResult.data.notes ?? null,
      organizationId: options.organizationId,
      passwordHistory: decryptedResult.data.passwordHistory ?? [],
      reprompt: value.reprompt ?? 0,
      revisionDate: value.revisionDate ?? null,
      secureNote: type === 2 ? itemData : null,
      card: type === 3 ? itemData : null,
      type,
    }
    items.push(item)
  }

  const payloadResult = bitwardenOrganizationJsonPayloadValidate(
    { collections: collectionValues, encrypted: false, items },
    { organizationId: options.organizationId },
  )
  if (!payloadResult.success) return payloadResult
  const formattedResult = bitwardenOrganizationJsonFormat(payloadResult.data, {
    organizationId: options.organizationId,
  })
  if (!formattedResult.success) return formattedResult
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  return resultCreate({
    content: formattedResult.data,
    filename: `onewarden_organization_export_${timestamp}.json`,
    mimeType: "application/json",
  })
}
