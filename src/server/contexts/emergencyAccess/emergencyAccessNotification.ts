export type EmergencyAccessNotification = {
  event:
    | "created"
    | "updated"
    | "deleted"
    | "accepted"
    | "confirmed"
    | "initiated"
    | "approved"
    | "rejected"
    | "reminder"
    | "timedOut"
  emergencyAccessId: string
  status: number | null
  type: number | null
  revisionDate: string
  userIds: readonly string[]
}
