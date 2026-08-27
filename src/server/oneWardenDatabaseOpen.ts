import { Database } from "bun:sqlite"
import { sql } from "drizzle-orm"
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite"
import { createResult, createResultError, type Result } from "#result"

type OneWardenDatabase = {
  readonly db: BunSQLiteDatabase
  readonly close: () => void
  readonly ready: () => Result<void>
}

export function oneWardenDatabaseOpen(databasePath: string): Result<OneWardenDatabase> {
  const op = "oneWardenDatabaseOpen"
  let sqlite: Database | undefined

  try {
    sqlite = new Database(databasePath)
    const db = drizzle(sqlite)
    const ready = (): Result<void> => {
      const readyOp = "oneWardenDatabaseReady"

      try {
        const result = db.get(sql`SELECT 1`) as readonly [number] | undefined
        if (result?.[0] !== 1)
          return createResultError(readyOp, "The SQLite readiness query returned an invalid result.")
        return createResult(undefined)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return createResultError(readyOp, `The SQLite readiness query failed: ${errorMessage}`)
      }
    }

    return createResult({
      close: () => sqlite?.close(),
      db,
      ready,
    })
  } catch (error) {
    sqlite?.close()
    const errorMessage = error instanceof Error ? error.message : String(error)
    return createResultError(op, `The SQLite database could not be opened: ${errorMessage}`)
  }
}
