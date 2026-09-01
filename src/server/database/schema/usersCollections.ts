import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { collections } from "./collections.js"
import { users } from "./users.js"

export const usersCollections = sqliteTable(
  "users_collections",
  {
    userUuid: text("user_uuid")
      .notNull()
      .references(() => users.uuid),
    collectionUuid: text("collection_uuid")
      .notNull()
      .references(() => collections.uuid),
    readOnly: integer("read_only", { mode: "boolean" }).notNull().default(false),
    hidePasswords: integer("hide_passwords", { mode: "boolean" }).notNull().default(false),
    manage: integer("manage", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.userUuid, table.collectionUuid] })],
)

export type UserCollectionRow = typeof usersCollections.$inferSelect
export type UserCollectionInsert = typeof usersCollections.$inferInsert
