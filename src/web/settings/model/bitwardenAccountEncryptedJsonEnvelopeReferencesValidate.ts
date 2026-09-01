import type { Result } from "#result"
import type { BitwardenAccountEncryptedJsonEnvelope } from "./bitwardenAccountEncryptedJsonEnvelopeSchema.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export function bitwardenAccountEncryptedJsonEnvelopeReferencesValidate(
  envelope: BitwardenAccountEncryptedJsonEnvelope,
): Result<void> {
  const op = "bitwardenAccountEncryptedJsonEnvelopeReferencesValidate"
  const folderIds = new Set<string>()
  for (const folder of envelope.folders) {
    if (folderIds.has(folder.id)) {
      return resultErrorCreate(op, `Account-encrypted export contains duplicate folder id '${folder.id}'.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    folderIds.add(folder.id)
  }

  const itemIds = new Set<string>()
  for (const [index, item] of envelope.items.entries()) {
    if (itemIds.has(item.id)) {
      return resultErrorCreate(op, `Account-encrypted export contains duplicate item id '${item.id}'.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    itemIds.add(item.id)

    if (item.folderId === undefined || item.folderId === null) continue
    if (!folderIds.has(item.folderId)) {
      return resultErrorCreate(
        op,
        `Account-encrypted export item at index ${index} references missing folder '${item.folderId}'.`,
        { code: "platform.invalid-request", statusCode: 400 },
      )
    }
  }

  return resultCreate(undefined)
}
