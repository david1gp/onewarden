export type IdentityRegistrationNormalizedData = {
  email: string
  passwordHash: string
  key: string
  kdf: number
  kdfIterations: number
  kdfMemory: number | null
  kdfParallelism: number | null
  passwordHint: string | null
  name: string | null
  organizationUserId: string | null
  emailVerificationToken: string | null
  acceptEmergencyAccessId: string | null
  acceptEmergencyAccessInviteToken: string | null
  orgInviteToken: string | null
  keys: { encryptedPrivateKey: string; publicKey: string } | null
  currentFormat: boolean
  currentAuthenticationSalt: string | null
  currentUnlockSalt: string | null
  currentUnlockKdf: {
    kdf: number
    kdfIterations: number
    kdfMemory: number | null
    kdfParallelism: number | null
  } | null
}
