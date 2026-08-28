export type Send = {
  uuid: string
  userUuid: string | null
  organizationUuid: string | null
  name: string
  notes: string | null
  type: number
  data: string
  key: string
  passwordHash: Uint8Array | null
  passwordSalt: Uint8Array | null
  passwordIterations: number | null
  maxAccessCount: number | null
  accessCount: number
  creationDate: string
  revisionDate: string
  expirationDate: string | null
  deletionDate: string
  disabled: boolean
  hideEmail: boolean | null
}
