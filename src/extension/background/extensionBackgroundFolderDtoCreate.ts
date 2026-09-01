import type { ExtensionFolder } from "../crypto/extensionFolderSchema.js"
import type { ExtensionBackgroundFolderDto } from "./extensionBackgroundFolderDtoSchema.js"

export function extensionBackgroundFolderDtoCreate(folder: ExtensionFolder): ExtensionBackgroundFolderDto {
  return {
    id: folder.id,
    name: folder.name,
    ...(folder.revisionDate === undefined ? {} : { revisionDate: folder.revisionDate }),
    ...(folder.object === undefined ? {} : { object: folder.object }),
  }
}
