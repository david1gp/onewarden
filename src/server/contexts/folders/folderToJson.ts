import type { Folder } from "./folder.js"

export function folderToJson(folder: Folder) {
  return {
    id: folder.uuid,
    revisionDate: folder.updatedAt,
    name: folder.name,
    object: "folder" as const,
  }
}
