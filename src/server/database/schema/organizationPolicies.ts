import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core"
import { organizations } from "./organizations.js"

export const organizationPolicies = sqliteTable(
  "org_policies",
  {
    uuid: text("uuid").notNull().primaryKey(),
    orgUuid: text("org_uuid")
      .notNull()
      .references(() => organizations.uuid),
    atype: integer("atype").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull(),
    data: text("data").notNull(),
    revisionDate: text("revision_date").notNull().default("1970-01-01T00:00:00.000Z"),
  },
  (table) => [unique("org_policies_org_type_unique").on(table.orgUuid, table.atype)],
)

export type OrganizationPolicyRow = typeof organizationPolicies.$inferSelect
export type OrganizationPolicyInsert = typeof organizationPolicies.$inferInsert
