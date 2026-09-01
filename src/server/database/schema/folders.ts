import { index, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { users } from "./users.js"

export const folders = sqliteTable(
  "folders",
  {
    uuid: text("uuid").notNull().primaryKey(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    userUuid: text("user_uuid")
      .notNull()
      .references(() => users.uuid),
    name: text("name").notNull(),
  },
  (table) => [index("folders_user_uuid_index").on(table.userUuid)],
)

export type FolderRow = typeof folders.$inferSelect
export type FolderInsert = typeof folders.$inferInsert
