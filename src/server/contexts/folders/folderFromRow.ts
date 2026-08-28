import type { Folder } from "./folder.js"
import type { FolderRow } from "./folderRow.js"

export function folderFromRow(row: FolderRow): Folder {
  return {
    uuid: row.uuid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userUuid: row.user_uuid,
    name: row.name,
  }
}
