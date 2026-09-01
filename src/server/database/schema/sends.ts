import { blob, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { organizations } from "./organizations.js"
import { users } from "./users.js"

export const sends = sqliteTable(
  "sends",
  {
    uuid: text("uuid").notNull().primaryKey(),
    userUuid: text("user_uuid").references(() => users.uuid),
    organizationUuid: text("organization_uuid").references(() => organizations.uuid),
    name: text("name").notNull(),
    notes: text("notes"),
    atype: integer("atype").notNull(),
    data: text("data").notNull(),
    key: text("key").notNull(),
    passwordHash: blob("password_hash", { mode: "buffer" }),
    passwordSalt: blob("password_salt", { mode: "buffer" }),
    passwordIter: integer("password_iter"),
    maxAccessCount: integer("max_access_count"),
    accessCount: integer("access_count").notNull(),
    creationDate: text("creation_date").notNull(),
    revisionDate: text("revision_date").notNull(),
    expirationDate: text("expiration_date"),
    deletionDate: text("deletion_date").notNull(),
    disabled: integer("disabled", { mode: "boolean" }).notNull(),
    hideEmail: integer("hide_email", { mode: "boolean" }),
    emails: text("emails"),
  },
  (table) => [
    index("sends_user_uuid_index").on(table.userUuid),
    index("sends_organization_uuid_index").on(table.organizationUuid),
  ],
)

export type SendRow = typeof sends.$inferSelect
export type SendInsert = typeof sends.$inferInsert
