import { sqliteTable, text } from "drizzle-orm/sqlite-core"
import { users } from "./users.js"

export const ssoUsers = sqliteTable("sso_users", {
  userUuid: text("user_uuid")
    .notNull()
    .primaryKey()
    .references(() => users.uuid),
  identifier: text("identifier").notNull().unique(),
})

export type SsoUserRow = typeof ssoUsers.$inferSelect
export type SsoUserInsert = typeof ssoUsers.$inferInsert
