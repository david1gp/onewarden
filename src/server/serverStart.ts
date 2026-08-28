import { loggerCreate } from "../shared/logging/loggerCreate.js"
import { identityConfigLoad } from "./contexts/identity/identityConfigLoad.js"
import { serverConfigLoad } from "./config/serverConfigLoad.js"
import { databaseClose } from "./database/databaseClose.js"
import { databaseMigrate } from "./database/databaseMigrate.js"
import { databaseOpen } from "./database/databaseOpen.js"
import { serverAppCreate } from "./serverAppCreate.js"

const defaultLogger = loggerCreate()
export function serverStart(): void {
  const configResult = serverConfigLoad()
  if (!configResult.success) {
    defaultLogger.error("server.configuration.invalid", { errorMessage: configResult.errorMessage })
    process.exit(1)
  }

  const logger = loggerCreate({ level: configResult.data.LOG_LEVEL })
  const identityConfigResult = identityConfigLoad()
  if (!identityConfigResult.success) {
    logger.error("server.identity-configuration.invalid", { errorMessage: identityConfigResult.errorMessage })
    process.exit(1)
  }
  const databaseResult = databaseOpen(configResult.data.DATABASE_PATH)
  if (!databaseResult.success) {
    logger.error("database.open-failed", { errorMessage: databaseResult.errorMessage })
    process.exit(1)
  }

  const database = databaseResult.data
  const migrationResult = databaseMigrate(database)
  if (!migrationResult.success) {
    logger.error("database.migration-failed", { errorMessage: migrationResult.errorMessage })
    const closeResult = databaseClose(database)
    if (!closeResult.success) logger.error("database.close-failed", { errorMessage: closeResult.errorMessage })
    process.exit(1)
  }

  const app = serverAppCreate({
    database,
    identity: { config: identityConfigResult.data, publicOrigin: configResult.data.PUBLIC_ORIGIN },
    logger,
  })
  try {
    const server = Bun.serve({
      fetch: app.fetch,
      hostname: configResult.data.HOST,
      port: configResult.data.PORT,
    })
    logger.info("server.started", {
      host: configResult.data.HOST,
      port: configResult.data.PORT,
    })

    let shutdownPromise: Promise<void> | undefined
    const shutdown = (): Promise<void> => {
      if (shutdownPromise !== undefined) return shutdownPromise
      shutdownPromise = (async () => {
        try {
          await server.stop(true)
        } catch {
          logger.error("server.stop-failed", { error: "stop-failed" })
        }
        const closeResult = databaseClose(database)
        if (!closeResult.success) logger.error("database.close-failed", { errorMessage: closeResult.errorMessage })
      })()
      return shutdownPromise
    }
    process.once("SIGINT", () => void shutdown())
    process.once("SIGTERM", () => void shutdown())
  } catch {
    const closeResult = databaseClose(database)
    if (!closeResult.success) logger.error("database.close-failed", { errorMessage: closeResult.errorMessage })
    logger.error("server.start-failed", { error: "listen-failed" })
    process.exit(1)
  }
}

if (import.meta.main) serverStart()
