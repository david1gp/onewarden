import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { ciphers } from "./ciphers.js"

export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id").notNull().primaryKey(),
    cipherUuid: text("cipher_uuid")
      .notNull()
      .references(() => ciphers.uuid, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull(),
    akey: text("akey"),
  },
  (table) => [index("attachments_cipher_uuid_index").on(table.cipherUuid)],
)

export type AttachmentRow = typeof attachments.$inferSelect
export type AttachmentInsert = typeof attachments.$inferInsert
