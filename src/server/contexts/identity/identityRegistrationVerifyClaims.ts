export type IdentityRegistrationVerifyClaims = {
  nbf: number
  exp: number
  iss: string
  sub: string
  name: string | null
  verified: boolean
}
