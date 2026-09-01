import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core"
import { sqliteDateTime } from "./sqliteDateTime.js"

export const event = sqliteTable(
  "event",
  {
    uuid: text("uuid").notNull().primaryKey(),
    eventType: integer("event_type").notNull(),
    userUuid: text("user_uuid"),
    orgUuid: text("org_uuid"),
    cipherUuid: text("cipher_uuid"),
    collectionUuid: text("collection_uuid"),
    groupUuid: text("group_uuid"),
    orgUserUuid: text("org_user_uuid"),
    actUserUuid: text("act_user_uuid"),
    deviceType: integer("device_type"),
    ipAddress: text("ip_address"),
    eventDate: sqliteDateTime("event_date").notNull(),
    policyUuid: text("policy_uuid"),
    providerUuid: text("provider_uuid"),
    providerUserUuid: text("provider_user_uuid"),
    providerOrgUuid: text("provider_org_uuid"),
  },
  (table) => [unique("event_uuid_unique").on(table.uuid), index("event_event_date_index").on(table.eventDate)],
)

export type EventRow = typeof event.$inferSelect
export type EventInsert = typeof event.$inferInsert
