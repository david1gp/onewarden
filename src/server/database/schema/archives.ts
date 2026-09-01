import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { ciphers } from "./ciphers.js"
import { users } from "./users.js"

export const archives = sqliteTable(
  "archives",
  {
    userUuid: text("user_uuid")
      .notNull()
      .references(() => users.uuid),
    cipherUuid: text("cipher_uuid")
      .notNull()
      .references(() => ciphers.uuid),
    archivedAt: text("archived_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userUuid, table.cipherUuid] })],
)

export type ArchiveRow = typeof archives.$inferSelect
export type ArchiveInsert = typeof archives.$inferInsert
