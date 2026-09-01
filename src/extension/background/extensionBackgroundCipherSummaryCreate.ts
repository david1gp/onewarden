import type { ExtensionCipher } from "../crypto/extensionCipherSchema.js"
import type { ExtensionBackgroundCipherSummary } from "./extensionBackgroundCipherSummarySchema.js"

export function extensionBackgroundCipherSummaryCreate(cipher: ExtensionCipher): ExtensionBackgroundCipherSummary {
  const permissions =
    cipher.permissions === undefined || cipher.permissions === null
      ? cipher.permissions
      : {
          ...(cipher.permissions.delete === undefined ? {} : { delete: cipher.permissions.delete }),
          ...(cipher.permissions.restore === undefined ? {} : { restore: cipher.permissions.restore }),
        }
  return {
    object: "cipherMini",
    id: cipher.id,
    type: cipher.type,
    ...(cipher.creationDate === undefined ? {} : { creationDate: cipher.creationDate }),
    revisionDate: cipher.revisionDate,
    deletedDate: cipher.deletedDate,
    ...(cipher.archivedDate === undefined ? {} : { archivedDate: cipher.archivedDate }),
    organizationId: cipher.organizationId ?? null,
    folderId: cipher.folderId ?? null,
    name: cipher.name,
    ...(cipher.favorite === undefined ? {} : { favorite: cipher.favorite }),
    ...(cipher.collectionIds === undefined ? {} : { collectionIds: cipher.collectionIds }),
    ...(cipher.edit === undefined ? {} : { edit: cipher.edit }),
    ...(cipher.viewPassword === undefined ? {} : { viewPassword: cipher.viewPassword }),
    ...(permissions === undefined ? {} : { permissions }),
  }
}
