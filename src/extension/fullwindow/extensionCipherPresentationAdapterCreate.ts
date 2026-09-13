import type { Result } from "#result"
import * as v from "valibot"
import { base64Encode } from "../../shared/crypto/base64Encode.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import type { CipherFormData } from "../../web/ciphers/schemas/cipherFormDataSchema.js"
import type { CipherItem } from "../../web/ciphers/schemas/cipherItemSchema.js"
import { cipherItemFromWire } from "../../web/ciphers/model/cipherItemFromWire.js"
import { cipherItemToWire } from "../../web/ciphers/model/cipherItemToWire.js"
import type { CipherPresentationAdapter } from "../../web/ciphers/ui/cipherPresentationAdapter.js"
import type { ExtensionCipher } from "../crypto/extensionCipherSchema.js"
import { extensionCipherSchema } from "../crypto/extensionCipherSchema.js"
import type { ExtensionRuntimeMessage } from "../messaging/extensionRuntimeMessageSchema.js"
import { extensionRuntimeMessageSend } from "../messaging/extensionRuntimeMessageSend.js"
import type { ExtensionClipboardAdapter } from "../clipboard/extensionClipboardAdapter.js"
import { extensionClipboardAdapterCreate } from "../clipboard/extensionClipboardAdapterCreate.js"
import { extensionVaultSearchResultSchema } from "../background/extensionVaultSearchResultSchema.js"

export function extensionCipherPresentationAdapterCreate(
  options: {
    messageSend?: <T = unknown>(message: ExtensionRuntimeMessage) => Promise<Result<T>>
    clipboard?: ExtensionClipboardAdapter
  } = {},
): CipherPresentationAdapter {
  const sender = options.messageSend ?? extensionRuntimeMessageSend
  const clipboard = options.clipboard ?? extensionClipboardAdapterCreate()
  const cipherCache = new Map<string, ExtensionCipher>()

  const resultCipherItemMap = (op: string, result: Result<unknown>): Result<CipherItem> => {
    if (!result.success) return result
    const parsed = v.safeParse(extensionCipherSchema, result.data)
    if (!parsed.success) return resultErrorCreate(op, "Extension cipher response is invalid.")
    cipherCache.set(parsed.output.id, parsed.output)
    return resultCreate(cipherItemFromWire(parsed.output as unknown as Record<string, unknown>))
  }

  const cipherMutationCreate = (
    data: CipherFormData | CipherItem,
    existing?: ExtensionCipher,
  ): Result<ExtensionCipher> => {
    const wire = cipherItemToWire(data)
    const now = new Date().toISOString()
    const id = existing?.id ?? ("id" in data ? data.id : extensionCipherIdCreate())
    const type = data.type
    const common = {
      object: existing?.object ?? ("cipherDetails" as const),
      id,
      type,
      creationDate: existing?.creationDate ?? now,
      revisionDate: now,
      deletedDate: existing?.deletedDate ?? null,
      archivedDate: existing?.archivedDate ?? null,
      organizationId: "organizationId" in data ? (data.organizationId ?? null) : (existing?.organizationId ?? null),
      folderId: wire.folderId === undefined ? (existing?.folderId ?? null) : wire.folderId,
      name: typeof wire.name === "string" ? wire.name : (existing?.name ?? ""),
      notes: typeof wire.notes === "string" ? wire.notes : null,
      favorite: wire.favorite === true,
      collectionIds: existing?.collectionIds ?? ("collectionIds" in data ? (data.collectionIds ?? []) : []),
      reprompt: existing?.reprompt ?? 0,
      fields: Array.isArray(wire.fields) ? wire.fields : [],
      attachments: existing?.attachments ?? null,
      passwordHistory: existing?.passwordHistory ?? null,
      ...(existing?.key === undefined ? {} : { key: existing.key }),
      ...(existing?.viewPassword === undefined ? {} : { viewPassword: existing.viewPassword }),
      ...(existing?.edit === undefined ? {} : { edit: existing.edit }),
      ...(existing?.permissions === undefined ? {} : { permissions: existing.permissions }),
    }

    const payload =
      type === 1
        ? { login: presentationLoginCreate(wire.login, existing?.login) }
        : type === 2
          ? { secureNote: presentationRecordCreate(wire.secureNote, existing?.secureNote) }
          : type === 3
            ? { card: presentationRecordCreate(wire.card, existing?.card) }
            : type === 4
              ? { identity: presentationRecordCreate(wire.identity, existing?.identity) }
              : { sshKey: presentationRecordCreate(wire.sshKey, existing?.sshKey) }

    const parsed = v.safeParse(extensionCipherSchema, { ...common, ...payload })
    if (!parsed.success)
      return resultErrorCreate("extensionCipherPresentationAdapter.cipherMutationCreate", "Cipher form is invalid.")
    return resultCreate(parsed.output)
  }

  const cipherGet = async (id: string): Promise<Result<CipherItem>> => {
    const result = await sender({ type: "cipherDetailRead", request: { cipherId: id } })
    return resultCipherItemMap("extensionCipherPresentationAdapter.get", result)
  }

  const cipherCreate = async (data: CipherFormData | CipherItem): Promise<Result<CipherItem>> => {
    const cipherResult = cipherMutationCreate(data)
    if (!cipherResult.success) return cipherResult
    const result = await sender({ type: "cipherCreate", request: { cipher: cipherResult.data } })
    return resultCipherItemMap("extensionCipherPresentationAdapter.create", result)
  }

  const cipherUpdate = async (id: string, data: CipherFormData | CipherItem): Promise<Result<CipherItem>> => {
    let existing = cipherCache.get(id)
    if (existing === undefined) {
      const current = await sender({ type: "cipherDetailRead", request: { cipherId: id } })
      if (!current.success) return current as Result<CipherItem>
      const parsed = v.safeParse(extensionCipherSchema, current.data)
      if (!parsed.success)
        return resultErrorCreate("extensionCipherPresentationAdapter.update", "Cipher response is invalid.")
      existing = parsed.output
      cipherCache.set(id, existing)
    }
    const cipherResult = cipherMutationCreate(data, existing)
    if (!cipherResult.success) return cipherResult
    const result = await sender({ type: "cipherUpdate", request: { cipherId: id, cipher: cipherResult.data } })
    return resultCipherItemMap("extensionCipherPresentationAdapter.update", result)
  }

  const cipherFavorite = async (id: string, favorite: boolean): Promise<Result<void>> => {
    const result = await sender({ type: "cipherPartial", request: { cipherId: id, favorite } })
    if (!result.success) return result
    const parsed = v.safeParse(extensionCipherSchema, result.data)
    if (parsed.success) cipherCache.set(id, parsed.output)
    return resultCreate(undefined)
  }

  const cipherDelete = async (id: string, hard: boolean): Promise<Result<void>> => {
    const result = await sender({ type: "cipherDelete", request: { cipherId: id, hard } })
    if (!result.success) return result
    cipherCache.delete(id)
    return resultCreate(undefined)
  }

  const cipherRestore = async (id: string): Promise<Result<CipherItem>> => {
    const result = await sender({ type: "cipherRestore", request: { cipherId: id } })
    return resultCipherItemMap("extensionCipherPresentationAdapter.restore", result)
  }

  const cipherArchive = async (id: string, archived: boolean): Promise<Result<CipherItem>> => {
    const result = await sender({ type: "cipherArchive", request: { cipherId: id, archived } })
    return resultCipherItemMap("extensionCipherPresentationAdapter.archive", result)
  }

  const cipherShare = async (): Promise<Result<CipherItem>> =>
    resultErrorCreate(
      "extensionCipherPresentationAdapter.share",
      "Sharing a personal cipher is not available in the extension vault.",
      { code: "platform.forbidden", statusCode: 403 },
    )

  const cipherCollectionsUpdate = async (id: string, collectionIds: string[]): Promise<Result<CipherItem>> => {
    const result = await sender({ type: "cipherCollectionsUpdate", request: { cipherId: id, collectionIds } })
    return resultCipherItemMap("extensionCipherPresentationAdapter.updateCollections", result)
  }

  const cipherUploadAttachment = async (
    cipherId: string,
    file: Blob | File,
    fileName: string,
  ): Promise<Result<CipherItem>> => {
    let bytes: Uint8Array
    try {
      bytes = new Uint8Array(await file.arrayBuffer())
    } catch {
      return resultErrorCreate(
        "extensionCipherPresentationAdapter.uploadAttachment",
        "Attachment file could not be read.",
      )
    }
    const dataBase64 = base64Encode(bytes)
    bytes.fill(0)
    const result = await sender({ type: "attachmentUpload", request: { cipherId, fileName, dataBase64 } })
    return resultCipherItemMap("extensionCipherPresentationAdapter.uploadAttachment", result)
  }

  const cipherDeleteAttachment = async (cipherId: string, attachmentId: string): Promise<Result<void>> => {
    const result = await sender({ type: "attachmentDelete", request: { cipherId, attachmentId } })
    if (!result.success) return result
    const parsed = v.safeParse(extensionCipherSchema, result.data)
    if (parsed.success) cipherCache.set(cipherId, parsed.output)
    return resultCreate(undefined)
  }

  const cipherClone = async (id: string): Promise<Result<CipherItem>> => {
    const current = cipherCache.get(id)
    if (current === undefined) {
      const result = await sender({ type: "cipherDetailRead", request: { cipherId: id } })
      if (!result.success) return result as Result<CipherItem>
      const parsed = v.safeParse(extensionCipherSchema, result.data)
      if (!parsed.success)
        return resultErrorCreate("extensionCipherPresentationAdapter.clone", "Cipher response is invalid.")
      cipherCache.set(id, parsed.output)
    }
    const source = cipherCache.get(id)
    if (source === undefined) return resultErrorCreate("extensionCipherPresentationAdapter.clone", "Cipher not found.")
    const now = new Date().toISOString()
    const cloned = {
      ...source,
      object: "cipherDetails" as const,
      id: extensionCipherIdCreate(),
      name: `${source.name} (Clone)`,
      favorite: false,
      creationDate: now,
      revisionDate: now,
      deletedDate: null,
      archivedDate: null,
    }
    const result = await sender({ type: "cipherCreate", request: { cipher: cloned } })
    return resultCipherItemMap("extensionCipherPresentationAdapter.clone", result)
  }

  return {
    list: async (): Promise<Result<CipherItem[]>> => {
      const result = await sender({
        type: "vaultSearch",
        request: { query: "", includeDeleted: false, includeArchived: false },
      })
      if (!result.success) return result
      const parsed = v.safeParse(extensionVaultSearchResultSchema, result.data)
      if (!parsed.success)
        return resultErrorCreate("extensionCipherPresentationAdapter.list", "Vault search response is invalid.")
      return resultCreate(
        parsed.output.ciphers.map((cipher) => cipherItemFromWire(cipher as unknown as Record<string, unknown>)),
      )
    },
    get: cipherGet,
    create: cipherCreate,
    update: cipherUpdate,
    favorite: cipherFavorite,
    softDelete: (id) => cipherDelete(id, false),
    hardDelete: (id) => cipherDelete(id, true),
    restore: cipherRestore,
    archive: cipherArchive,
    share: cipherShare,
    updateCollections: cipherCollectionsUpdate,
    uploadAttachment: cipherUploadAttachment,
    deleteAttachment: cipherDeleteAttachment,
    clone: cipherClone,
    copyToClipboard: async (value: string) => {
      await clipboard.copyText(value)
    },
  }
}

function extensionCipherIdCreate(): string {
  return globalThis.crypto?.randomUUID?.() ?? `extension-cipher-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function presentationRecordCreate(value: unknown, fallback: unknown): Record<string, unknown> {
  if (isRecord(value)) return value
  if (isRecord(fallback)) return fallback
  return {}
}

function presentationLoginCreate(value: unknown, fallback: ExtensionCipher["login"]): Record<string, unknown> {
  const source = isRecord(value) ? value : isRecord(fallback) ? fallback : {}
  const uris = Array.isArray(source.uris)
    ? source.uris
    : typeof source.uri === "string"
      ? [{ uri: source.uri, match: null }]
      : []
  return {
    username: typeof source.username === "string" ? source.username : null,
    password: typeof source.password === "string" ? source.password : null,
    totp: typeof source.totp === "string" ? source.totp : null,
    uris,
    ...(source.uri === undefined ? {} : { uri: source.uri }),
    ...(source.fido2Credentials === undefined ? {} : { fido2Credentials: source.fido2Credentials }),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
