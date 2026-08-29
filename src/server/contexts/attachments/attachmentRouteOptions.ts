import type { KeyInput } from "jose"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { CipherNotificationAdapter } from "../ciphers/cipherNotificationAdapter.js"
import type { PushRelayAdapter } from "../push/pushRelayAdapter.js"
import type { AttachmentFileStorageAdapter } from "./attachmentFileStorageAdapter.js"

export type AttachmentRouteOptions = {
  clock: Clock
  database: DatabaseConnection | undefined
  groupsEnabled?: boolean
  identifier: Identifier
  maxFileSizeBytes?: number
  notification?: CipherNotificationAdapter
  organizationQuotaBytes?: number | null
  privateKey: KeyInput | undefined
  publicKey: KeyInput | undefined
  publicOrigin: string | undefined
  push?: PushRelayAdapter
  quotaBytes?: number | null
  storage?: AttachmentFileStorageAdapter
  userQuotaBytes?: number | null
}
