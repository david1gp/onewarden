export type Cipher = {
  uuid: string
  createdAt: string
  updatedAt: string
  userUuid: string | null
  organizationUuid: string | null
  key: string | null
  type: number
  name: string
  notes: string | null
  fields: string | null
  data: string
  passwordHistory: string | null
  deletedAt: string | null
  reprompt: number | null
}
