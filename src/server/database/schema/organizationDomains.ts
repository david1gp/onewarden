import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core"
import { organizations } from "./organizations.js"

export const organizationDomains = sqliteTable(
  "organization_domains",
  {
    uuid: text("uuid").notNull().primaryKey(),
    orgUuid: text("org_uuid")
      .notNull()
      .references(() => organizations.uuid),
    txt: text("txt").notNull(),
    domainName: text("domain_name").notNull(),
    creationDate: text("creation_date").notNull(),
    nextRunDate: text("next_run_date").notNull(),
    jobRunCount: integer("job_run_count").notNull().default(0),
    verifiedDate: text("verified_date"),
    lastCheckedDate: text("last_checked_date"),
  },
  (table) => [
    unique("organization_domains_org_domain_unique").on(table.orgUuid, table.domainName),
    index("organization_domains_org_uuid_index").on(table.orgUuid),
    index("organization_domains_domain_name_index").on(table.domainName),
  ],
)

export type OrganizationDomainRow = typeof organizationDomains.$inferSelect
export type OrganizationDomainInsert = typeof organizationDomains.$inferInsert
