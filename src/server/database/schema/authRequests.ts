import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { organizations } from "./organizations.js"
import { sqliteDateTime } from "./sqliteDateTime.js"
import { users } from "./users.js"

export const authRequests = sqliteTable(
  "auth_requests",
  {
    uuid: text("uuid").notNull().primaryKey(),
    userUuid: text("user_uuid")
      .notNull()
      .references(() => users.uuid),
    organizationUuid: text("organization_uuid").references(() => organizations.uuid),
    requestDeviceIdentifier: text("request_device_identifier").notNull(),
    deviceType: integer("device_type").notNull(),
    requestIp: text("request_ip").notNull(),
    responseDeviceId: text("response_device_id"),
    accessCode: text("access_code").notNull(),
    publicKey: text("public_key").notNull(),
    encKey: text("enc_key"),
    masterPasswordHash: text("master_password_hash"),
    approved: integer("approved", { mode: "boolean" }),
    creationDate: sqliteDateTime("creation_date").notNull(),
    responseDate: sqliteDateTime("response_date"),
    authenticationDate: sqliteDateTime("authentication_date"),
  },
  (table) => [
    index("auth_requests_user_uuid_index").on(table.userUuid),
    index("auth_requests_organization_uuid_index").on(table.organizationUuid),
    index("auth_requests_pending_device_index").on(
      table.userUuid,
      table.requestDeviceIdentifier,
      table.approved,
      table.creationDate,
    ),
  ],
)

export type AuthRequestRow = typeof authRequests.$inferSelect
export type AuthRequestInsert = typeof authRequests.$inferInsert
