import { sql } from "drizzle-orm"
import { check, foreignKey, index, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { ciphers } from "./ciphers.js"
import { devices } from "./devices.js"
import { users } from "./users.js"

export const extensionSessionHandoffs = sqliteTable(
  "extension_session_handoffs",
  {
    tokenHash: text("token_hash").notNull().primaryKey(),
    userUuid: text("user_uuid")
      .notNull()
      .references(() => users.uuid, { onDelete: "cascade" }),
    sourceDeviceUuid: text("source_device_uuid").notNull(),
    operation: text("operation").notNull(),
    cipherUuid: text("cipher_uuid").references(() => ciphers.uuid, { onDelete: "cascade" }),
    userKeyIv: text("user_key_iv").notNull(),
    userKeyCiphertext: text("user_key_ciphertext").notNull(),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (table) => [
    check("extension_session_handoffs_operation_check", sql`${table.operation} IN ('create', 'edit')`),
    check(
      "extension_session_handoffs_operation_cipher_check",
      sql`(${table.operation} = 'create' AND ${table.cipherUuid} IS NULL) OR (${table.operation} = 'edit' AND ${table.cipherUuid} IS NOT NULL)`,
    ),
    foreignKey({
      columns: [table.sourceDeviceUuid, table.userUuid],
      foreignColumns: [devices.uuid, devices.userUuid],
    }).onDelete("cascade"),
    index("extension_session_handoffs_expiry_index").on(table.expiresAt),
    index("extension_session_handoffs_user_device_index").on(table.userUuid, table.sourceDeviceUuid),
  ],
)

export type ExtensionSessionHandoffRow = typeof extensionSessionHandoffs.$inferSelect
export type ExtensionSessionHandoffInsert = typeof extensionSessionHandoffs.$inferInsert
