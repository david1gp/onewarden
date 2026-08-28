import type { IdentityConfig } from "./identityConfigSchema.js"
import type { IdentityUser } from "./identityUser.js"

export function identityUserProfileToJson(user: IdentityUser, config: IdentityConfig) {
  const accountKeys =
    user.privateKey === null
      ? null
      : {
          publicKeyEncryptionKeyPair: {
            wrappedPrivateKey: user.privateKey,
            publicKey: user.publicKey,
            signedPublicKey: null,
            object: "publicKeyEncryptionKeyPair" as const,
          },
          securityState: null,
          signatureKeyPair: null,
          object: "privateKeys" as const,
        }
  return {
    _status: user.passwordHash.byteLength === 0 ? 1 : 0,
    accountKeys,
    id: user.uuid,
    name: user.name,
    email: user.email,
    emailVerified: !config.MAIL_ENABLED || user.verifiedAt !== null,
    premium: true,
    premiumFromOrganization: false,
    culture: "en-US",
    twoFactorEnabled: false,
    key: user.akey,
    privateKey: user.privateKey,
    securityStamp: user.securityStamp,
    organizations: [],
    providers: [],
    providerOrganizations: [],
    forcePasswordReset: false,
    avatarColor: user.avatarColor,
    usesKeyConnector: false,
    creationDate: user.createdAt,
    object: "profile" as const,
  }
}
