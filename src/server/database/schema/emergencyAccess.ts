import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { users } from "./users.js"

export const emergencyAccess = sqliteTable(
  "emergency_access",
  {
    uuid: text("uuid").notNull().primaryKey(),
    grantorUuid: text("grantor_uuid")
      .notNull()
      .references(() => users.uuid),
    granteeUuid: text("grantee_uuid").references(() => users.uuid),
    email: text("email"),
    keyEncrypted: text("key_encrypted"),
    atype: integer("atype").notNull(),
    status: integer("status").notNull(),
    waitTimeDays: integer("wait_time_days").notNull(),
    recoveryInitiatedAt: text("recovery_initiated_at"),
    lastNotificationAt: text("last_notification_at"),
    updatedAt: text("updated_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("emergency_access_grantor_uuid_index").on(table.grantorUuid),
    index("emergency_access_grantee_uuid_index").on(table.granteeUuid),
    index("emergency_access_email_index").on(table.email),
  ],
)

export type EmergencyAccessRow = typeof emergencyAccess.$inferSelect
export type EmergencyAccessInsert = typeof emergencyAccess.$inferInsert
