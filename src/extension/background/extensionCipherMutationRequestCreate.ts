import * as v from "valibot"
import type { Result } from "#result"
import {
  type BitwardenEncryptedCipherMutationRequest,
  bitwardenEncryptedCipherMutationRequestSchema,
} from "../../shared/api/bitwardenEncryptedCipherMutationRequestSchema.js"
import {
  type BitwardenEncryptedCipher,
  bitwardenEncryptedCipherSchema,
} from "../../shared/api/bitwardenEncryptedCipherSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

type ExtensionCipherMutationRequestOptions = {
  collectionIds?: readonly string[]
  lastKnownRevisionDate?: string | null
}

export function extensionCipherMutationRequestCreate(
  cipher: BitwardenEncryptedCipher,
  options: ExtensionCipherMutationRequestOptions = {},
): Result<BitwardenEncryptedCipherMutationRequest> {
  const op = "extensionCipherMutationRequestCreate"
  const cipherResult = v.safeParse(bitwardenEncryptedCipherSchema, cipher)
  if (!cipherResult.success) {
    return resultErrorCreate(op, "Encrypted extension cipher is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
      errorData: v.summarize(cipherResult.issues),
    })
  }

  const encryptedCipher = cipherResult.output
  const payload: Record<string, unknown> = {}
  if (encryptedCipher.type === 1) payload.login = encryptedCipher.login
  if (encryptedCipher.type === 2) payload.secureNote = encryptedCipher.secureNote
  if (encryptedCipher.type === 3) payload.card = encryptedCipher.card
  if (encryptedCipher.type === 4) payload.identity = encryptedCipher.identity
  if (encryptedCipher.type === 5) payload.sshKey = encryptedCipher.sshKey

  const request: Record<string, unknown> = {
    ...payload,
    ...(encryptedCipher.id === undefined ? {} : { id: encryptedCipher.id }),
    folderId: encryptedCipher.folderId ?? null,
    organizationId: encryptedCipher.organizationId ?? null,
    key: encryptedCipher.key ?? null,
    type: encryptedCipher.type,
    name: encryptedCipher.name,
    notes: encryptedCipher.notes ?? null,
    fields: encryptedCipher.fields ?? [],
    ...(encryptedCipher.favorite === undefined ? {} : { favorite: encryptedCipher.favorite }),
    ...(encryptedCipher.reprompt === undefined ? {} : { reprompt: encryptedCipher.reprompt }),
    ...(encryptedCipher.attachments === undefined ? {} : { attachments: encryptedCipher.attachments }),
    ...(encryptedCipher.passwordHistory === undefined ? {} : { passwordHistory: encryptedCipher.passwordHistory }),
    ...(options.collectionIds === undefined
      ? encryptedCipher.collectionIds === undefined || encryptedCipher.collectionIds === null
        ? {}
        : { collectionIds: [...encryptedCipher.collectionIds] }
      : { collectionIds: [...options.collectionIds] }),
    ...(options.lastKnownRevisionDate === undefined ? {} : { lastKnownRevisionDate: options.lastKnownRevisionDate }),
    ...(encryptedCipher.archivedDate === undefined ? {} : { archivedDate: encryptedCipher.archivedDate }),
  }
  const parsed = v.safeParse(bitwardenEncryptedCipherMutationRequestSchema, request)
  if (!parsed.success) {
    return resultErrorCreate(op, "Cipher mutation request is invalid.", {
      code: "platform.internal",
      statusCode: 500,
      errorData: v.summarize(parsed.issues),
    })
  }
  return resultCreate(parsed.output)
}
