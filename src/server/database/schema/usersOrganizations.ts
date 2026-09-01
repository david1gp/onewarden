import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core"
import { organizations } from "./organizations.js"
import { users } from "./users.js"

export const usersOrganizations = sqliteTable(
  "users_organizations",
  {
    uuid: text("uuid").notNull().primaryKey(),
    userUuid: text("user_uuid")
      .notNull()
      .references(() => users.uuid),
    orgUuid: text("org_uuid")
      .notNull()
      .references(() => organizations.uuid),
    invitedByEmail: text("invited_by_email"),
    accessAll: integer("access_all", { mode: "boolean" }).notNull().default(false),
    akey: text("akey").notNull(),
    status: integer("status").notNull(),
    atype: integer("atype").notNull(),
    resetPasswordKey: text("reset_password_key"),
    externalId: text("external_id"),
  },
  (table) => [unique("users_organizations_user_org_unique").on(table.userUuid, table.orgUuid)],
)

export type UserOrganizationRow = typeof usersOrganizations.$inferSelect
export type UserOrganizationInsert = typeof usersOrganizations.$inferInsert
