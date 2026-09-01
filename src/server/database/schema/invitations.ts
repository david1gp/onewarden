import { sqliteTable, text } from "drizzle-orm/sqlite-core"

export const invitations = sqliteTable("invitations", {
  email: text("email").notNull().primaryKey(),
})

export type InvitationRow = typeof invitations.$inferSelect
export type InvitationInsert = typeof invitations.$inferInsert
