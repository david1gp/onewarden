import { sqliteTable, text } from "drizzle-orm/sqlite-core"
import { organizations } from "./organizations.js"

export const collections = sqliteTable("collections", {
  uuid: text("uuid").notNull().primaryKey(),
  orgUuid: text("org_uuid")
    .notNull()
    .references(() => organizations.uuid),
  name: text("name").notNull(),
  externalId: text("external_id"),
})

export type CollectionRow = typeof collections.$inferSelect
export type CollectionInsert = typeof collections.$inferInsert
