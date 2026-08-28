import type { KeyInput } from "jose"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"

export type AuthenticationOptions = {
  clock?: Clock
  database?: DatabaseConnection
  groupsEnabled?: boolean
  issuer?: string
  publicKey?: KeyInput
  publicOrigin?: string
  routeName?: string
}
