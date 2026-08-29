import { type Result, type ResultErr } from "#result"
import type { Context } from "hono"
import type { DatabaseConnection } from "../../database/database.js"
import type { AuthenticationContext } from "./authenticationContext.js"
import { authenticationContextGet } from "./authenticationContextGet.js"
import type { AuthenticationEnvironment } from "./authenticationEnvironment.js"

type AuthenticationDatabaseRequestContextResolveOptions = {
  authenticationErrorCreate: () => ResultErr
  databaseErrorCreate: () => ResultErr
  databaseOverride: DatabaseConnection | undefined
}

export function authenticationDatabaseRequestContextResolve(
  context: Context<AuthenticationEnvironment>,
  options: AuthenticationDatabaseRequestContextResolveOptions,
): Result<{ authentication: AuthenticationContext; database: DatabaseConnection }> {
  const authentication = authenticationContextGet(context)
  if (authentication === undefined) return options.authenticationErrorCreate()
  const database = options.databaseOverride ?? context.get("database")
  if (database === undefined) return options.databaseErrorCreate()
  return { success: true, data: { authentication, database } }
}
