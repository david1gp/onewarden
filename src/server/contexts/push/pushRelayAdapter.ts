import type { Result } from "#result"
import type { IdentityDevice } from "../identity/identityDevice.js"
import type { PushRelayNotification } from "./pushRelayNotification.js"

export type PushRelayAdapter = {
  registerDevice: (device: IdentityDevice) => Promise<Result<void>>
  unregisterDevice: (pushUuid: string | null) => Promise<Result<void>>
  dispatch: (notification: PushRelayNotification) => Promise<void>
}
