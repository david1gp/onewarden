import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { ciphers } from "./ciphers.js"
import { users } from "./users.js"

export const favorites = sqliteTable(
  "favorites",
  {
    userUuid: text("user_uuid")
      .notNull()
      .references(() => users.uuid),
    cipherUuid: text("cipher_uuid")
      .notNull()
      .references(() => ciphers.uuid),
  },
  (table) => [primaryKey({ columns: [table.userUuid, table.cipherUuid] })],
)

export type FavoriteRow = typeof favorites.$inferSelect
export type FavoriteInsert = typeof favorites.$inferInsert
