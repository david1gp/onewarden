import type { Result } from "#result"
import type { TwoFactorWebAuthnAuthentication } from "./twoFactorWebAuthnAuthentication.js"

export type TwoFactorDuoCredentials = {
  host: string
  clientId: string
  clientSecret: string
}

export type TwoFactorDuoLogin = {
  credentials: TwoFactorDuoCredentials
  email: string
  token: string
  state: string | null
}

export type TwoFactorWebAuthnState = {
  challenge: string
  credentialIds: string[]
  credentials?: TwoFactorWebAuthnCredential[]
  expiresAt: number
  appId?: string
  origin: string
  rpId: string
  kind: "registration" | "login"
  userUuid: string
}

export type TwoFactorWebAuthnCredential = {
  counter?: number
  id: string
  name?: string
  publicKey?: string
  transports?: string[]
}

export type TwoFactorAdapters = {
  duo?: {
    credentialsValidate?: (credentials: TwoFactorDuoCredentials) => Promise<Result<void>>
    loginValidate?: (login: TwoFactorDuoLogin) => Promise<Result<void>>
  }
  yubikey?: {
    otpValidate?: (otp: string) => Promise<Result<void>>
  }
  webauthn?: {
    registrationValidate?: (
      response: unknown,
      state: TwoFactorWebAuthnState,
    ) => Promise<Result<TwoFactorWebAuthnCredential>>
    loginValidate?: (
      response: unknown,
      state: TwoFactorWebAuthnState,
    ) => Promise<Result<undefined | TwoFactorWebAuthnAuthentication>>
  }
}
