import type { DatabaseConnection } from "../../database/database.js"

export type AdminDiagnosticsAdapter = {
  collect: (input: {
    database: DatabaseConnection | undefined
    ipHeaderName: string
    requestUrl: string
  }) => Promise<Record<string, unknown>> | Record<string, unknown>
}
