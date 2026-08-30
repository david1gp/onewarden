export type IdentityAuthRequest = {
  uuid: string
  userUuid: string
  organizationUuid: string | null
  requestDeviceIdentifier: string
  deviceType: number
  requestIp: string
  responseDeviceId: string | null
  accessCode: string
  publicKey: string
  encKey: string | null
  masterPasswordHash: string | null
  approved: boolean | null
  creationDate: string
  responseDate: string | null
  authenticationDate: string | null
}
