import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { organizations } from "./organizations.js"
import { users } from "./users.js"

export const ciphers = sqliteTable(
  "ciphers",
  {
    uuid: text("uuid").notNull().primaryKey(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    userUuid: text("user_uuid").references(() => users.uuid),
    organizationUuid: text("organization_uuid").references(() => organizations.uuid),
    key: text("key"),
    atype: integer("atype").notNull(),
    name: text("name").notNull(),
    notes: text("notes"),
    fields: text("fields"),
    data: text("data").notNull(),
    passwordHistory: text("password_history"),
    deletedAt: text("deleted_at"),
    reprompt: integer("reprompt"),
    wireData: text("wire_data"),
  },
  (table) => [
    index("ciphers_user_uuid_index").on(table.userUuid),
    index("ciphers_organization_uuid_index").on(table.organizationUuid),
    index("ciphers_deleted_at_index").on(table.deletedAt),
  ],
)

export type CipherRow = typeof ciphers.$inferSelect
export type CipherInsert = typeof ciphers.$inferInsert
