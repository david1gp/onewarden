import type { KeyInput } from "jose"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { CipherNotificationAdapter } from "./cipherNotificationAdapter.js"
import type { AttachmentFileStorageAdapter } from "../attachments/attachmentFileStorageAdapter.js"
import type { EventAdapter } from "../events/eventAdapter.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"

export type CipherRouteOptions = {
  clock: Clock
  config: Pick<IdentityConfig, "EMAIL_ATTEMPTS_LIMIT" | "EMAIL_EXPIRATION_TIME">
  attachmentStorage?: AttachmentFileStorageAdapter
  database: DatabaseConnection | undefined
  groupsEnabled: boolean
  event?: EventAdapter
  identifier: Identifier
  maxNoteSize?: number
  notification?: CipherNotificationAdapter
  privateKey?: KeyInput
  publicKey: KeyInput | undefined
  publicOrigin: string | undefined
}
