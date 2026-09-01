import type { ExtensionCollection } from "../crypto/extensionCollectionSchema.js"
import type { ExtensionBackgroundCollectionDto } from "./extensionBackgroundCollectionDtoSchema.js"

export function extensionBackgroundCollectionDtoCreate(
  collection: ExtensionCollection,
): ExtensionBackgroundCollectionDto {
  return {
    id: collection.id,
    organizationId: collection.organizationId,
    name: collection.name,
    ...(collection.externalId === undefined ? {} : { externalId: collection.externalId }),
    ...(collection.type === undefined ? {} : { type: collection.type }),
    ...(collection.object === undefined ? {} : { object: collection.object }),
    ...(collection.assigned === undefined ? {} : { assigned: collection.assigned }),
    ...(collection.hidePasswords === undefined ? {} : { hidePasswords: collection.hidePasswords }),
    ...(collection.manage === undefined ? {} : { manage: collection.manage }),
    ...(collection.readOnly === undefined ? {} : { readOnly: collection.readOnly }),
    ...(collection.unmanaged === undefined ? {} : { unmanaged: collection.unmanaged }),
  }
}
