import type { KeyInput } from "jose"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { EventAdapter } from "./eventAdapter.js"

export type EventRouteOptions = {
  clock: Clock
  database: DatabaseConnection | undefined
  enabled: boolean
  event?: EventAdapter
  publicKey: KeyInput | undefined
  publicOrigin: string | undefined
}
