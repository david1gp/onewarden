import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { users } from "./users.js"

export const twoFactorIncomplete = sqliteTable(
  "twofactor_incomplete",
  {
    userUuid: text("user_uuid")
      .notNull()
      .references(() => users.uuid),
    deviceUuid: text("device_uuid").notNull(),
    deviceName: text("device_name").notNull(),
    deviceType: integer("device_type").notNull(),
    loginTime: text("login_time").notNull(),
    ipAddress: text("ip_address").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userUuid, table.deviceUuid] })],
)

export type TwoFactorIncompleteRow = typeof twoFactorIncomplete.$inferSelect
export type TwoFactorIncompleteInsert = typeof twoFactorIncomplete.$inferInsert
