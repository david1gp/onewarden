import type { EmergencyAccessNotification } from "./emergencyAccessNotification.js"
import type { EmergencyAccessNotificationAdapter } from "./emergencyAccessNotificationAdapter.js"

export async function emergencyAccessNotificationSend(
  adapter: EmergencyAccessNotificationAdapter,
  notification: EmergencyAccessNotification,
): Promise<void> {
  await adapter.sendEmergencyAccessUpdate?.(notification)
}
