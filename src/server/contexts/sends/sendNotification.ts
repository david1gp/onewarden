export type SendNotification = {
  contextId: string
  userIds?: readonly string[]
  payload: {
    Id: string
    UserId: string | null
    OrganizationId: string | null
    RevisionDate: string
  }
  type: number
}
