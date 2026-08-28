import type { EmergencyAccessNotification } from "./emergencyAccessNotification.js"

export type EmergencyAccessNotificationAdapter = {
  sendEmergencyAccessUpdate?: (notification: EmergencyAccessNotification) => void | Promise<void>
}
