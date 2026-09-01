import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { users } from "./users.js"

export const devices = sqliteTable(
  "devices",
  {
    uuid: text("uuid").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    userUuid: text("user_uuid")
      .notNull()
      .references(() => users.uuid),
    name: text("name").notNull(),
    atype: integer("atype").notNull(),
    pushUuid: text("push_uuid"),
    pushToken: text("push_token"),
    refreshToken: text("refresh_token").notNull(),
    twofactorRemember: text("twofactor_remember"),
  },
  (table) => [primaryKey({ columns: [table.uuid, table.userUuid] })],
)

export type DeviceRow = typeof devices.$inferSelect
export type DeviceInsert = typeof devices.$inferInsert
