import { Database } from "bun:sqlite"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import type { Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "./database.js"
import { databaseConnectionStore } from "./databaseConnectionStore.js"

const DATABASE_BUSY_TIMEOUT_MS = 5_000

function databasePathIsMemory(databasePath: string): boolean {
  return databasePath === "" || databasePath === ":memory:"
}

export function databaseOpen(databasePath = ":memory:"): Result<DatabaseConnection> {
  const op = "databaseOpen"
  let database: Database | undefined
  try {
    const isMemory = databasePathIsMemory(databasePath)
    if (!isMemory) mkdirSync(dirname(databasePath), { recursive: true })

    database = new Database(databasePath)
    database.run("PRAGMA foreign_keys = ON")
    database.run(`PRAGMA busy_timeout = ${DATABASE_BUSY_TIMEOUT_MS}`)
    if (!isMemory) database.run("PRAGMA journal_mode = WAL")
    return resultCreate(databaseConnectionStore.create(database))
  } catch {
    database?.close()
    return resultErrorCreate(op, "Database open failed.")
  }
}
