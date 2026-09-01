import type { Result } from "#result"
import { sql } from "drizzle-orm"
import { getTableConfig, type SQLiteTable } from "drizzle-orm/sqlite-core"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "./database.js"
import { databaseSchema } from "./schema/databaseSchema.js"

const databaseCurrentSchemaTables = Object.values(databaseSchema).map(
  (table) => getTableConfig(table as SQLiteTable).name,
)

export function databaseSchemaTablesValidate(database: Pick<DatabaseConnection, "drizzle">): Result<void> {
  const op = "databaseSchemaTablesValidate"
  try {
    const tableNames = new Set(
      database.drizzle
        .values<[string]>(sql`SELECT name FROM sqlite_master WHERE type = 'table'`)
        .map((row) => row[0])
        .filter((name): name is string => name !== undefined),
    )
    if (databaseCurrentSchemaTables.some((tableName) => !tableNames.has(tableName)))
      return resultErrorCreate(op, "Database schema is incomplete.")
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Database schema could not be inspected.")
  }
}
