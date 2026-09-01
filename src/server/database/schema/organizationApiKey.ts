import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const organizationApiKey = sqliteTable(
  "organization_api_key",
  {
    uuid: text("uuid").notNull(),
    orgUuid: text("org_uuid").notNull(),
    atype: integer("atype").notNull(),
    apiKey: text("api_key").notNull(),
    revisionDate: text("revision_date").notNull(),
  },
  (table) => [primaryKey({ columns: [table.uuid, table.orgUuid] })],
)

export type OrganizationApiKeyRow = typeof organizationApiKey.$inferSelect
export type OrganizationApiKeyInsert = typeof organizationApiKey.$inferInsert
