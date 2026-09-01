import { foreignKey, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { folders } from "./folders.js"

export const foldersCiphers = sqliteTable(
  "folders_ciphers",
  {
    cipherUuid: text("cipher_uuid").notNull(),
    folderUuid: text("folder_uuid").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.cipherUuid, table.folderUuid] }),
    foreignKey({ columns: [table.folderUuid], foreignColumns: [folders.uuid] }),
  ],
)

export type FolderCipherRow = typeof foldersCiphers.$inferSelect
export type FolderCipherInsert = typeof foldersCiphers.$inferInsert
