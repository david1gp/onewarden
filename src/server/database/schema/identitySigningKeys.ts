import { sql } from "drizzle-orm"
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const identitySigningKeys = sqliteTable(
  "identity_signing_keys",
  {
    id: integer("id").notNull().primaryKey(),
    privateKeyPem: text("private_key_pem").notNull(),
    publicKeyPem: text("public_key_pem").notNull(),
  },
  (table) => [check("identity_signing_keys_id_check", sql`${table.id} = 1`)],
)

export type IdentitySigningKeyRow = typeof identitySigningKeys.$inferSelect
export type IdentitySigningKeyInsert = typeof identitySigningKeys.$inferInsert
