import type { KeyInput } from "jose"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { HibpHttpAdapter } from "./hibpHttpAdapter.js"

export type HibpRouteOptions = {
  apiKey?: string | null
  clock: Clock
  database: DatabaseConnection | undefined
  http: HibpHttpAdapter
  publicKey: KeyInput | undefined
  publicOrigin: string | undefined
}
