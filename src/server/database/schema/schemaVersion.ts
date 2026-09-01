import { sql } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const schemaVersion = sqliteTable("schema_version", {
  version: integer("version").notNull().primaryKey(),
  appliedAt: text("applied_at").notNull().default(sql`CURRENT_TIMESTAMP`),
})

export type SchemaVersionRow = typeof schemaVersion.$inferSelect
export type SchemaVersionInsert = typeof schemaVersion.$inferInsert
