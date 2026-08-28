import type { IdentityPasswordTokenResponse } from "./identityPasswordTokenResponseSchema.js"
import type { IdentityTokenBundle } from "./identityTokenBundle.js"
import type { IdentityUser } from "./identityUser.js"

export function identityUserTokenResponseCreate(
  user: IdentityUser,
  bundle: IdentityTokenBundle,
): IdentityPasswordTokenResponse {
  const hasMasterPassword = user.passwordHash.byteLength > 0
  const masterPasswordUnlock = hasMasterPassword
    ? {
        Kdf: {
          KdfType: user.clientKdfType,
          Iterations: user.clientKdfIter,
          Memory: user.clientKdfMemory,
          Parallelism: user.clientKdfParallelism,
        },
        MasterKeyEncryptedUserKey: user.akey,
        MasterKeyWrappedUserKey: user.akey,
        Salt: user.email,
      }
    : null
  const accountKeys =
    user.privateKey === null
      ? null
      : {
          publicKeyEncryptionKeyPair: {
            wrappedPrivateKey: user.privateKey,
            publicKey: user.publicKey,
            Object: "publicKeyEncryptionKeyPair" as const,
          },
          Object: "privateKeys" as const,
        }
  const response: IdentityPasswordTokenResponse = {
    access_token: bundle.accessToken,
    expires_in: bundle.expiresIn,
    token_type: "Bearer",
    refresh_token: bundle.refreshToken,
    PrivateKey: user.privateKey,
    Kdf: user.clientKdfType,
    KdfIterations: user.clientKdfIter,
    KdfMemory: user.clientKdfMemory,
    KdfParallelism: user.clientKdfParallelism,
    ResetMasterPassword: false,
    ForcePasswordReset: false,
    MasterPasswordPolicy: { Object: "masterPasswordPolicy" },
    scope: "api offline_access",
    AccountKeys: accountKeys,
    UserDecryptionOptions: {
      HasMasterPassword: hasMasterPassword,
      MasterPasswordUnlock: masterPasswordUnlock,
      Object: "userDecryptionOptions",
    },
  }
  if (user.akey !== "") response.Key = user.akey
  return response
}
