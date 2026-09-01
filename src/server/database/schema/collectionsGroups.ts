import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core"
import { collections } from "./collections.js"
import { groups } from "./groups.js"

export const collectionsGroups = sqliteTable(
  "collections_groups",
  {
    collectionsUuid: text("collections_uuid")
      .notNull()
      .references(() => collections.uuid),
    groupsUuid: text("groups_uuid")
      .notNull()
      .references(() => groups.uuid),
    readOnly: integer("read_only", { mode: "boolean" }).notNull().default(false),
    hidePasswords: integer("hide_passwords", { mode: "boolean" }).notNull().default(false),
    manage: integer("manage", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [unique("collections_groups_collection_group_unique").on(table.collectionsUuid, table.groupsUuid)],
)

export type CollectionGroupRow = typeof collectionsGroups.$inferSelect
export type CollectionGroupInsert = typeof collectionsGroups.$inferInsert
