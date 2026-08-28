export type CipherNotification = {
  contextId: string
  userIds?: readonly string[]
  payload: {
    Id: string
    UserId: string | null
    OrganizationId: string | null
    CollectionIds: string[] | null
    RevisionDate: string
  }
  type: number
}
