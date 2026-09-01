import { sqliteTable, text, unique } from "drizzle-orm/sqlite-core"
import { groups } from "./groups.js"
import { usersOrganizations } from "./usersOrganizations.js"

export const groupsUsers = sqliteTable(
  "groups_users",
  {
    groupsUuid: text("groups_uuid")
      .notNull()
      .references(() => groups.uuid),
    usersOrganizationsUuid: text("users_organizations_uuid")
      .notNull()
      .references(() => usersOrganizations.uuid),
  },
  (table) => [unique("groups_users_group_membership_unique").on(table.groupsUuid, table.usersOrganizationsUuid)],
)

export type GroupUserRow = typeof groupsUsers.$inferSelect
export type GroupUserInsert = typeof groupsUsers.$inferInsert
