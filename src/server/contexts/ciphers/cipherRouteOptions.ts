import type { KeyInput } from "jose"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { CipherNotificationAdapter } from "./cipherNotificationAdapter.js"
import type { AttachmentFileStorageAdapter } from "../attachments/attachmentFileStorageAdapter.js"

export type CipherRouteOptions = {
  clock: Clock
  attachmentStorage?: AttachmentFileStorageAdapter
  database: DatabaseConnection | undefined
  groupsEnabled: boolean
  identifier: Identifier
  maxNoteSize?: number
  notification?: CipherNotificationAdapter
  privateKey?: KeyInput
  publicKey: KeyInput | undefined
  publicOrigin: string | undefined
}
