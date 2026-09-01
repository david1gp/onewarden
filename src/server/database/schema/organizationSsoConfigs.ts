import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { organizations } from "./organizations.js"

export const organizationSsoConfigs = sqliteTable("organization_sso_configs", {
  orgUuid: text("org_uuid")
    .notNull()
    .primaryKey()
    .references(() => organizations.uuid),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  data: text("data").notNull(),
  creationDate: text("creation_date").notNull(),
  revisionDate: text("revision_date").notNull(),
})

export type OrganizationSsoConfigRow = typeof organizationSsoConfigs.$inferSelect
export type OrganizationSsoConfigInsert = typeof organizationSsoConfigs.$inferInsert
