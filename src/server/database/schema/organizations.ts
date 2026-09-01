import { sqliteTable, text } from "drizzle-orm/sqlite-core"

export const organizations = sqliteTable("organizations", {
  uuid: text("uuid").notNull().primaryKey(),
  name: text("name").notNull(),
  billingEmail: text("billing_email").notNull(),
  privateKey: text("private_key"),
  publicKey: text("public_key"),
  identifier: text("identifier"),
})

export type OrganizationRow = typeof organizations.$inferSelect
export type OrganizationInsert = typeof organizations.$inferInsert
