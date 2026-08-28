import type { IdentityDevice } from "../identity/identityDevice.js"
import type { Send } from "./send.js"
import type { SendNotificationAdapter } from "./sendNotificationAdapter.js"

export async function sendNotificationSend(
  adapter: SendNotificationAdapter,
  type: number,
  send: Send,
  device: IdentityDevice,
): Promise<void> {
  if (adapter.sendSendUpdate === undefined) return
  try {
    await adapter.sendSendUpdate({
      contextId: device.uuid,
      payload: {
        Id: send.uuid,
        UserId: send.userUuid,
        OrganizationId: send.organizationUuid,
        RevisionDate: send.revisionDate,
      },
      type,
    })
  } catch {
    return
  }
}
