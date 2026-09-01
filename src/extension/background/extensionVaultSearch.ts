import * as v from "valibot"
import type { ExtensionCipher } from "../crypto/extensionCipherSchema.js"
import { extensionBackgroundCipherSummaryCreate } from "./extensionBackgroundCipherSummaryCreate.js"
import { extensionBackgroundCollectionDtoCreate } from "./extensionBackgroundCollectionDtoCreate.js"
import { extensionBackgroundFolderDtoCreate } from "./extensionBackgroundFolderDtoCreate.js"
import type { ExtensionSyncSnapshot } from "./extensionSyncSnapshotSchema.js"
import type { ExtensionVaultSearchRequest } from "./extensionVaultSearchRequestSchema.js"
import {
  type ExtensionVaultSearchResult,
  extensionVaultSearchResultSchema,
} from "./extensionVaultSearchResultSchema.js"

function searchTextRead(cipher: ExtensionCipher): string {
  const values = [cipher.name]
  if (cipher.type === 1) values.push(cipher.login.username ?? "", ...cipher.login.uris.map((entry) => entry.uri ?? ""))
  if (cipher.type === 3) values.push(cipher.card.cardholderName ?? "", cipher.card.brand ?? "")
  if (cipher.type === 4)
    values.push(
      cipher.identity.title ?? "",
      cipher.identity.firstName ?? "",
      cipher.identity.middleName ?? "",
      cipher.identity.lastName ?? "",
      cipher.identity.company ?? "",
    )
  if (cipher.type === 5) values.push(cipher.sshKey.keyFingerprint ?? "", cipher.sshKey.publicKey ?? "")
  return values.join("\u0000").toLocaleLowerCase()
}

function cipherMatches(cipher: ExtensionCipher, request: ExtensionVaultSearchRequest): boolean {
  if (!request.includeDeleted && cipher.deletedDate !== null) return false
  if (!request.includeArchived && cipher.archivedDate !== undefined && cipher.archivedDate !== null) return false
  if (request.type !== undefined && cipher.type !== request.type) return false
  if (request.folderId !== undefined && (cipher.folderId ?? null) !== request.folderId) return false
  if (
    request.collectionId !== undefined &&
    !(cipher.collectionIds ?? []).some((collectionId) => collectionId === request.collectionId)
  )
    return false
  if (request.organizationId !== undefined && (cipher.organizationId ?? null) !== request.organizationId) return false
  if (request.favorite !== undefined && cipher.favorite !== request.favorite) return false
  return request.query.trim() === "" || searchTextRead(cipher).includes(request.query.trim().toLocaleLowerCase())
}

function resourceMatches(name: string, query: string): boolean {
  return query.trim() === "" || name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
}

export function extensionVaultSearch(
  snapshot: ExtensionSyncSnapshot,
  request: ExtensionVaultSearchRequest,
): ExtensionVaultSearchResult {
  const ciphers = snapshot.ciphers
    .filter((cipher) => cipherMatches(cipher, request))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(extensionBackgroundCipherSummaryCreate)
  const folders = snapshot.folders
    .filter((folder) => resourceMatches(folder.name, request.query))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(extensionBackgroundFolderDtoCreate)
  const collections = snapshot.collections
    .filter((collection) => resourceMatches(collection.name, request.query))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(extensionBackgroundCollectionDtoCreate)
  const parsed = v.safeParse(extensionVaultSearchResultSchema, { ciphers, folders, collections })
  return parsed.success ? parsed.output : { ciphers, folders, collections }
}
