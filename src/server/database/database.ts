import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite"
import type { databaseSchema } from "./schema/databaseSchema.js"

export type DatabaseSchema = typeof databaseSchema

export type DatabaseConnection = {
  readonly drizzle: BunSQLiteDatabase<DatabaseSchema>
  readonly close: () => void
}
