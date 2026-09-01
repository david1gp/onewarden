import type { Database } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import type { DatabaseConnection } from "./database.js"
import { databaseSchema } from "./schema/databaseSchema.js"

const databaseClients = new WeakMap<DatabaseConnection, Database>()

export const databaseConnectionStore = {
  create(databaseClient: Database): DatabaseConnection {
    const databaseDrizzle = drizzle({ client: databaseClient, schema: databaseSchema })
    Reflect.deleteProperty(databaseDrizzle, "$client")
    const database: DatabaseConnection = {
      drizzle: databaseDrizzle,
      close: () => databaseClient.close(),
    }
    databaseClients.set(database, databaseClient)
    return database
  },
  migrationExecute(database: DatabaseConnection, migrationSql: string): boolean {
    const databaseClient = databaseClients.get(database)
    if (databaseClient === undefined) return false
    databaseClient.exec(migrationSql)
    return true
  },
}
