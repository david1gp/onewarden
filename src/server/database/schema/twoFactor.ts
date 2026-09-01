import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core"
import { users } from "./users.js"

export const twoFactor = sqliteTable(
  "twofactor",
  {
    uuid: text("uuid").notNull().primaryKey(),
    userUuid: text("user_uuid")
      .notNull()
      .references(() => users.uuid),
    atype: integer("atype").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    data: text("data").notNull(),
    lastUsed: integer("last_used").notNull().default(0),
  },
  (table) => [unique("twofactor_user_type_unique").on(table.userUuid, table.atype)],
)

export type TwoFactorRow = typeof twoFactor.$inferSelect
export type TwoFactorInsert = typeof twoFactor.$inferInsert
