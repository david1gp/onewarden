import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const users = sqliteTable("users", {
  uuid: text("uuid").notNull().primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  verifiedAt: text("verified_at"),
  lastVerifyingAt: text("last_verifying_at"),
  loginVerifyCount: integer("login_verify_count").notNull().default(0),
  email: text("email").notNull().unique(),
  emailNew: text("email_new"),
  emailNewToken: text("email_new_token"),
  name: text("name").notNull(),
  passwordHash: blob("password_hash", { mode: "buffer" }).notNull(),
  salt: blob("salt", { mode: "buffer" }).notNull(),
  passwordIterations: integer("password_iterations").notNull(),
  passwordHint: text("password_hint"),
  akey: text("akey").notNull(),
  privateKey: text("private_key"),
  publicKey: text("public_key"),
  securityStamp: text("security_stamp").notNull(),
  stampException: text("stamp_exception"),
  equivalentDomains: text("equivalent_domains").notNull().default("[]"),
  excludedGlobals: text("excluded_globals").notNull().default("[]"),
  clientKdfType: integer("client_kdf_type").notNull().default(0),
  clientKdfIter: integer("client_kdf_iter").notNull().default(600_000),
  clientKdfMemory: integer("client_kdf_memory"),
  clientKdfParallelism: integer("client_kdf_parallelism"),
  apiKey: text("api_key"),
  avatarColor: text("avatar_color"),
  externalId: text("external_id"),
  totpRecover: text("totp_recover"),
})

export type UserRow = typeof users.$inferSelect
export type UserInsert = typeof users.$inferInsert
