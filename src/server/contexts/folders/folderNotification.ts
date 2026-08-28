import type { Folder } from "./folder.js"
import type { folderUpdateType } from "./folderUpdateType.js"

export type FolderNotification = {
  contextId: string
  payload: {
    Id: string
    RevisionDate: string
    UserId: string
  }
  type: (typeof folderUpdateType)[keyof typeof folderUpdateType]
  folder: Folder
}
