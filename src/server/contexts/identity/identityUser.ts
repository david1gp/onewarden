export type IdentityUser = {
  uuid: string
  enabled: boolean
  createdAt: string
  updatedAt: string
  verifiedAt: string | null
  lastVerifyingAt: string | null
  loginVerifyCount: number
  email: string
  emailNew: string | null
  emailNewToken: string | null
  name: string
  passwordHash: Uint8Array
  salt: Uint8Array
  passwordIterations: number
  passwordHint: string | null
  akey: string
  privateKey: string | null
  publicKey: string | null
  securityStamp: string
  stampException: string | null
  equivalentDomains: string
  excludedGlobals: string
  clientKdfType: number
  clientKdfIter: number
  clientKdfMemory: number | null
  clientKdfParallelism: number | null
  apiKey: string | null
  avatarColor: string | null
  externalId: string | null
}
