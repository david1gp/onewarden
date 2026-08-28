import type { KeyInput } from "jose"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { FolderNotificationAdapter } from "./folderNotificationAdapter.js"

export type FolderRouteOptions = {
  clock: Clock
  database: DatabaseConnection | undefined
  identifier: Identifier
  notification?: FolderNotificationAdapter
  publicKey: KeyInput | undefined
  publicOrigin: string | undefined
}
