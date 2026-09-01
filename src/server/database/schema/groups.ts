import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { organizations } from "./organizations.js"

export const groups = sqliteTable("groups", {
  uuid: text("uuid").notNull().primaryKey(),
  organizationsUuid: text("organizations_uuid")
    .notNull()
    .references(() => organizations.uuid),
  name: text("name").notNull(),
  accessAll: integer("access_all", { mode: "boolean" }).notNull().default(false),
  externalId: text("external_id"),
  creationDate: text("creation_date").notNull(),
  revisionDate: text("revision_date").notNull(),
})

export type GroupRow = typeof groups.$inferSelect
export type GroupInsert = typeof groups.$inferInsert
