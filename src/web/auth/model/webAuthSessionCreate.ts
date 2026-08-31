import { type Result } from "#result"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { SessionHandoffConsumeResponse } from "../../../shared/sessionHandoff/sessionHandoffConsumeResponseSchema.js"
import { type TwoFactorChallenge } from "./twoFactorChallengeSchema.js"
import { webAuthApiClientCreate } from "./webAuthApiClientCreate.js"
import { webAuthMasterKeyDerive } from "./webAuthMasterKeyDerive.js"
import { webAuthMasterPasswordHashDerive } from "./webAuthMasterPasswordHashDerive.js"
import type { WebAuthSession } from "./webAuthSessionSchema.js"
import { webAuthStorageCreate } from "./webAuthStorageCreate.js"
import { webAuthUserIdResolve } from "./webAuthUserIdResolve.js"
import { webAuthUserKeyUnlock } from "./webAuthUserKeyUnlock.js"
import { webAuthUserKeysGenerate } from "./webAuthUserKeysGenerate.js"

export type WebAuthStatus = "unauthenticated" | "locked" | "unlocked"

export interface WebAuthLoginOptions {
  email: string
  masterPassword: string
  rememberEmail?: boolean
}

export interface WebAuthRegisterOptions {
  email: string
  masterPassword: string
  name?: string | null
  masterPasswordHint?: string | null
  rememberEmail?: boolean
}

export interface WebAuthTwoFactorLoginOptions {
  provider: string | number
  token: string
  remember?: boolean
  email?: string
  masterPassword?: string
}

export interface PendingTwoFactorContext {
  email: string
  masterPassword?: string
  passwordHashB64: string
  kdfMetadata: {
    kdfType: number
    iterations: number
    memory: number | null
    parallelism: number | null
  }
  rememberEmail?: boolean
  challenge: TwoFactorChallenge
}

export function webAuthSessionCreate(
  options: {
    storage?: ReturnType<typeof webAuthStorageCreate>
    apiClient?: ReturnType<typeof webAuthApiClientCreate>
  } = {},
) {
  const storage = options.storage ?? webAuthStorageCreate()
  const apiClient = options.apiClient ?? webAuthApiClientCreate()

  const loadedSessionResult = storage.sessionLoad()
  const initialSession = loadedSessionResult.success ? loadedSessionResult.data : null
  const rememberedEmailResult = storage.rememberedEmailLoad()
  const initialRememberedEmail = rememberedEmailResult.success ? rememberedEmailResult.data : null

  const session = createSignalObject<WebAuthSession | null>(initialSession)
  const status = createSignalObject<WebAuthStatus>(initialSession !== null ? "locked" : "unauthenticated")
  const rememberedEmail = createSignalObject<string | null>(initialRememberedEmail)
  const pendingTwoFactor = createSignalObject<PendingTwoFactorContext | null>(null)

  let inMemoryUserKey: Uint8Array | null = null

  const clearUserKey = (): void => {
    inMemoryUserKey?.fill(0)
    inMemoryUserKey = null
  }

  const isUnlocked = (): boolean => status.get() === "unlocked" && inMemoryUserKey !== null
  const isLocked = (): boolean => status.get() === "locked"
  const isUnauthenticated = (): boolean => status.get() === "unauthenticated"

  const lock = (): Result<void> => {
    clearUserKey()
    if (session.get() !== null) {
      status.set("locked")
    } else {
      status.set("unauthenticated")
    }
    return resultCreate(undefined)
  }

  const logout = (): Result<void> => {
    clearUserKey()
    session.set(null)
    pendingTwoFactor.set(null)
    status.set("unauthenticated")
    storage.sessionClear()
    return resultCreate(undefined)
  }

  const sessionHandoffAccept = (
    response: SessionHandoffConsumeResponse,
    transferredUserKey: Uint8Array,
  ): Result<WebAuthSession> => {
    const op = "webAuthSession.sessionHandoffAccept"
    if (transferredUserKey.byteLength !== 64) {
      return resultErrorCreate(op, "Transferred user key is invalid.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    const newSession: WebAuthSession = {
      email: response.email,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      tokenType: "Bearer",
      expiresAt: Date.now() + response.expiresIn * 1_000,
      userId: response.userId,
      kdf: response.kdf,
      kdfIterations: response.kdfIterations,
      kdfMemory: response.kdfMemory,
      kdfParallelism: response.kdfParallelism,
      encryptedUserKey: response.encryptedUserKey,
    }
    const saveResult = storage.sessionSave(newSession)
    if (!saveResult.success) return saveResult
    clearUserKey()
    inMemoryUserKey = transferredUserKey
    session.set(newSession)
    pendingTwoFactor.set(null)
    status.set("unlocked")
    return resultCreate(newSession)
  }

  const unlock = async (masterPassword: string): Promise<Result<void>> => {
    const op = "webAuthSession.unlock"
    const currentSession = session.get()
    if (currentSession === null) {
      return resultErrorCreate(op, "No active vault session to unlock.", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    }

    const unlockResult = await webAuthUserKeyUnlock(
      masterPassword,
      currentSession.email,
      {
        kdfType: currentSession.kdf,
        iterations: currentSession.kdfIterations,
        memory: currentSession.kdfMemory,
        parallelism: currentSession.kdfParallelism,
      },
      currentSession.encryptedUserKey,
    )
    if (!unlockResult.success) {
      return resultErrorCreate(op, "Invalid master password.")
    }

    clearUserKey()
    inMemoryUserKey = unlockResult.data
    status.set("unlocked")
    return resultCreate(undefined)
  }

  const masterPasswordHashDeriveForSession = async (
    password: string,
    emailOverride?: string,
    kdfOverride?: { kdfType: number; iterations: number; memory: number | null; parallelism: number | null },
  ): Promise<Result<string>> => {
    const currentSession = session.get()
    const targetEmail = emailOverride ?? currentSession?.email
    if (!targetEmail) {
      return resultErrorCreate("webAuthSession.masterPasswordHash", "No email available to derive password hash.")
    }
    const kdf = kdfOverride ?? {
      kdfType: currentSession?.kdf ?? 0,
      iterations: currentSession?.kdfIterations ?? 600_000,
      memory: currentSession?.kdfMemory ?? null,
      parallelism: currentSession?.kdfParallelism ?? null,
    }
    const masterKeyResult = await webAuthMasterKeyDerive(password, targetEmail, kdf)
    if (!masterKeyResult.success) return masterKeyResult
    const masterKey = masterKeyResult.data
    const hashResult = await webAuthMasterPasswordHashDerive(password, masterKey)
    masterKey.fill(0)
    return hashResult
  }

  const login = async (loginOptions: WebAuthLoginOptions): Promise<Result<WebAuthSession>> => {
    const op = "webAuthSession.login"
    const email = loginOptions.email.trim().toLowerCase()
    const password = loginOptions.masterPassword

    const preloginResult = await apiClient.prelogin(email)
    if (!preloginResult.success) return preloginResult
    const prelogin = preloginResult.data

    const kdfMetadata = {
      kdfType: prelogin.kdfSettings.kdfType,
      iterations: prelogin.kdfSettings.iterations,
      memory: prelogin.kdfSettings.memory,
      parallelism: prelogin.kdfSettings.parallelism,
    }

    const masterKeyResult = await webAuthMasterKeyDerive(password, email, kdfMetadata)
    if (!masterKeyResult.success) return masterKeyResult
    const masterKey = masterKeyResult.data

    const hashResult = await webAuthMasterPasswordHashDerive(password, masterKey)
    masterKey.fill(0)
    if (!hashResult.success) return hashResult
    const passwordHashB64 = hashResult.data

    const deviceIdentifier = storage.deviceIdentifierGet()
    const rememberTokenResult = storage.rememberTokenLoad(email)
    const remembered2faToken = rememberTokenResult.success ? rememberTokenResult.data : null

    // If a remembered device token exists, try logging in with provider 5 (remembered device)
    if (remembered2faToken !== null) {
      const rememberedTokenResult = await apiClient.login({
        username: email,
        passwordHashB64,
        deviceIdentifier,
        twoFactorProvider: 5,
        twoFactorToken: remembered2faToken,
      })
      if (rememberedTokenResult.success) {
        const token = rememberedTokenResult.data
        const encryptedUserKey =
          token.UserDecryptionOptions.MasterPasswordUnlock?.MasterKeyEncryptedUserKey ?? token.Key ?? ""
        if (encryptedUserKey.length > 0) {
          const userKeyResult = await webAuthUserKeyUnlock(password, email, kdfMetadata, encryptedUserKey)
          if (userKeyResult.success) {
            const newSession: WebAuthSession = {
              email,
              accessToken: token.access_token,
              refreshToken: token.refresh_token,
              tokenType: "Bearer",
              expiresAt: Date.now() + token.expires_in * 1000,
              userId: webAuthUserIdResolve(token.access_token),
              kdf: token.Kdf,
              kdfIterations: token.KdfIterations,
              kdfMemory: token.KdfMemory,
              kdfParallelism: token.KdfParallelism,
              encryptedUserKey,
            }
            storage.sessionSave(newSession)
            if (loginOptions.rememberEmail) {
              storage.rememberedEmailSave(email)
              rememberedEmail.set(email)
            } else {
              storage.rememberedEmailSave(null)
              rememberedEmail.set(null)
            }
            if (token.TwoFactorToken) {
              storage.rememberTokenSave(email, token.TwoFactorToken)
            }
            clearUserKey()
            inMemoryUserKey = userKeyResult.data
            session.set(newSession)
            pendingTwoFactor.set(null)
            status.set("unlocked")
            return resultCreate(newSession)
          }
        }
      } else {
        storage.rememberTokenClear(email)
      }
    }

    const tokenResult = await apiClient.login({
      username: email,
      passwordHashB64,
      deviceIdentifier,
    })

    if (!tokenResult.success) {
      if (tokenResult.code === "auth.two-factor-required" && tokenResult.errorData) {
        try {
          const challenge = JSON.parse(tokenResult.errorData) as TwoFactorChallenge
          pendingTwoFactor.set({
            email,
            masterPassword: password,
            passwordHashB64,
            kdfMetadata,
            rememberEmail: loginOptions.rememberEmail,
            challenge,
          })
        } catch {
          // Ignore json parse error
        }
      }
      return tokenResult
    }
    const token = tokenResult.data

    const encryptedUserKey =
      token.UserDecryptionOptions.MasterPasswordUnlock?.MasterKeyEncryptedUserKey ?? token.Key ?? ""
    if (encryptedUserKey.length === 0) {
      return resultErrorCreate(op, "Token response did not provide an encrypted user key.", {
        code: "platform.internal",
        statusCode: 500,
      })
    }

    const userKeyResult = await webAuthUserKeyUnlock(password, email, kdfMetadata, encryptedUserKey)
    if (!userKeyResult.success) return userKeyResult

    const newSession: WebAuthSession = {
      email,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenType: "Bearer",
      expiresAt: Date.now() + token.expires_in * 1000,
      userId: webAuthUserIdResolve(token.access_token),
      kdf: token.Kdf,
      kdfIterations: token.KdfIterations,
      kdfMemory: token.KdfMemory,
      kdfParallelism: token.KdfParallelism,
      encryptedUserKey,
    }

    storage.sessionSave(newSession)
    if (loginOptions.rememberEmail) {
      storage.rememberedEmailSave(email)
      rememberedEmail.set(email)
    } else {
      storage.rememberedEmailSave(null)
      rememberedEmail.set(null)
    }

    clearUserKey()
    inMemoryUserKey = userKeyResult.data
    session.set(newSession)
    pendingTwoFactor.set(null)
    status.set("unlocked")
    return resultCreate(newSession)
  }

  const loginTwoFactor = async (twoFactorOptions: WebAuthTwoFactorLoginOptions): Promise<Result<WebAuthSession>> => {
    const op = "webAuthSession.loginTwoFactor"
    const pending = pendingTwoFactor.get()
    const email = (twoFactorOptions.email ?? pending?.email ?? "").trim().toLowerCase()
    const password = twoFactorOptions.masterPassword ?? pending?.masterPassword
    let passwordHashB64 = pending?.passwordHashB64
    let kdfMetadata = pending?.kdfMetadata

    if ((!passwordHashB64 || !kdfMetadata) && password && email) {
      const preloginResult = await apiClient.prelogin(email)
      if (!preloginResult.success) return preloginResult
      kdfMetadata = {
        kdfType: preloginResult.data.kdfSettings.kdfType,
        iterations: preloginResult.data.kdfSettings.iterations,
        memory: preloginResult.data.kdfSettings.memory,
        parallelism: preloginResult.data.kdfSettings.parallelism,
      }
      const hashResult = await masterPasswordHashDeriveForSession(password, email, kdfMetadata)
      if (!hashResult.success) return hashResult
      passwordHashB64 = hashResult.data
    }

    if (!passwordHashB64 || !kdfMetadata || !password) {
      return resultErrorCreate(op, "Missing authentication credentials for two-factor login.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }

    const deviceIdentifier = storage.deviceIdentifierGet()
    const tokenResult = await apiClient.login({
      username: email,
      passwordHashB64,
      deviceIdentifier,
      twoFactorProvider: twoFactorOptions.provider,
      twoFactorToken: twoFactorOptions.token,
      twoFactorRemember: twoFactorOptions.remember ? "1" : "0",
    })

    if (!tokenResult.success) {
      return tokenResult
    }
    const token = tokenResult.data

    const encryptedUserKey =
      token.UserDecryptionOptions.MasterPasswordUnlock?.MasterKeyEncryptedUserKey ?? token.Key ?? ""
    if (encryptedUserKey.length === 0) {
      return resultErrorCreate(op, "Token response did not provide an encrypted user key.", {
        code: "platform.internal",
        statusCode: 500,
      })
    }

    const userKeyResult = await webAuthUserKeyUnlock(password, email, kdfMetadata, encryptedUserKey)
    if (!userKeyResult.success) return userKeyResult

    const newSession: WebAuthSession = {
      email,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenType: "Bearer",
      expiresAt: Date.now() + token.expires_in * 1000,
      userId: webAuthUserIdResolve(token.access_token),
      kdf: token.Kdf,
      kdfIterations: token.KdfIterations,
      kdfMemory: token.KdfMemory,
      kdfParallelism: token.KdfParallelism,
      encryptedUserKey,
    }

    storage.sessionSave(newSession)
    if (twoFactorOptions.remember && token.TwoFactorToken) {
      storage.rememberTokenSave(email, token.TwoFactorToken)
    }
    if (pending?.rememberEmail) {
      storage.rememberedEmailSave(email)
      rememberedEmail.set(email)
    }

    clearUserKey()
    inMemoryUserKey = userKeyResult.data
    session.set(newSession)
    pendingTwoFactor.set(null)
    status.set("unlocked")
    return resultCreate(newSession)
  }

  const register = async (registerOptions: WebAuthRegisterOptions): Promise<Result<void>> => {
    const email = registerOptions.email.trim().toLowerCase()
    const password = registerOptions.masterPassword
    const kdfMetadata = {
      kdfType: 0,
      iterations: 600_000,
      memory: null,
      parallelism: null,
    }

    const keysResult = await webAuthUserKeysGenerate(password, email, kdfMetadata)
    if (!keysResult.success) return keysResult

    const masterKeyResult = await webAuthMasterKeyDerive(password, email, kdfMetadata)
    if (!masterKeyResult.success) return masterKeyResult
    const masterKey = masterKeyResult.data

    const hashResult = await webAuthMasterPasswordHashDerive(password, masterKey)
    masterKey.fill(0)
    if (!hashResult.success) return hashResult

    const registerResult = await apiClient.register({
      email,
      masterPasswordHash: hashResult.data,
      userSymmetricKey: keysResult.data.wrappedUserKey,
      masterPasswordHint: registerOptions.masterPasswordHint,
      name: registerOptions.name,
      kdf: 0,
      kdfIterations: 600_000,
      keys: {
        encryptedPrivateKey: keysResult.data.encryptedPrivateKey,
        publicKey: keysResult.data.publicKey,
      },
    })
    if (!registerResult.success) return registerResult

    if (registerOptions.rememberEmail) {
      storage.rememberedEmailSave(email)
      rememberedEmail.set(email)
    }

    return resultCreate(undefined)
  }

  // --- Authenticated Two-Factor Setup Helpers ---

  const currentAccessToken = (): string | null => session.get()?.accessToken ?? null

  const providersTwoFactorGet = async () => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    return apiClient.twoFactorProvidersGet(token)
  }

  const recoverTwoFactorGet = async (password?: string) => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    let hash: string | undefined
    if (password) {
      const hashResult = await masterPasswordHashDeriveForSession(password)
      if (!hashResult.success) return hashResult
      hash = hashResult.data
    }
    return apiClient.twoFactorRecoverGet(token, hash)
  }

  const providerTwoFactorDisable = async (type: number | string, password?: string) => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    let hash: string | undefined
    if (password) {
      const hashResult = await masterPasswordHashDeriveForSession(password)
      if (!hashResult.success) return hashResult
      hash = hashResult.data
    }
    return apiClient.twoFactorDisable(token, { type, masterPasswordHash: hash })
  }

  const authenticatorTwoFactorGet = async (password?: string) => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    let hash: string | undefined
    if (password) {
      const hashResult = await masterPasswordHashDeriveForSession(password)
      if (!hashResult.success) return hashResult
      hash = hashResult.data
    }
    return apiClient.twoFactorAuthenticatorGet(token, hash)
  }

  const authenticatorTwoFactorActivate = async (key: string, totpToken: string | number, password?: string) => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    let hash: string | undefined
    if (password) {
      const hashResult = await masterPasswordHashDeriveForSession(password)
      if (!hashResult.success) return hashResult
      hash = hashResult.data
    }
    return apiClient.twoFactorAuthenticatorActivate(token, { key, token: totpToken, masterPasswordHash: hash })
  }

  const authenticatorTwoFactorDisable = async (key: string, password: string) => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    const hashResult = await masterPasswordHashDeriveForSession(password)
    if (!hashResult.success) return hashResult
    return apiClient.twoFactorAuthenticatorDisable(token, { key, masterPasswordHash: hashResult.data, type: 0 })
  }

  const emailTwoFactorLoginSend = async (emailOverride?: string, password?: string) => {
    const email = emailOverride ?? pendingTwoFactor.get()?.email ?? session.get()?.email
    const deviceIdentifier = storage.deviceIdentifierGet()
    let hash: string | undefined
    if (password && email) {
      const hashResult = await masterPasswordHashDeriveForSession(password, email)
      if (hashResult.success) hash = hashResult.data
    }
    return apiClient.twoFactorEmailLoginSend({ email, deviceIdentifier, masterPasswordHash: hash })
  }

  const emailTwoFactorGet = async (password?: string) => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    let hash: string | undefined
    if (password) {
      const hashResult = await masterPasswordHashDeriveForSession(password)
      if (!hashResult.success) return hashResult
      hash = hashResult.data
    }
    return apiClient.twoFactorEmailGet(token, hash)
  }

  const emailTwoFactorSend = async (email: string, password?: string) => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    let hash: string | undefined
    if (password) {
      const hashResult = await masterPasswordHashDeriveForSession(password)
      if (!hashResult.success) return hashResult
      hash = hashResult.data
    }
    return apiClient.twoFactorEmailSend(token, { email, masterPasswordHash: hash })
  }

  const emailTwoFactorActivate = async (email: string, emailToken: string, password?: string) => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    let hash: string | undefined
    if (password) {
      const hashResult = await masterPasswordHashDeriveForSession(password)
      if (!hashResult.success) return hashResult
      hash = hashResult.data
    }
    return apiClient.twoFactorEmailActivate(token, { email, token: emailToken, masterPasswordHash: hash })
  }

  const duoTwoFactorGet = async (password?: string) => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    let hash: string | undefined
    if (password) {
      const hashResult = await masterPasswordHashDeriveForSession(password)
      if (!hashResult.success) return hashResult
      hash = hashResult.data
    }
    return apiClient.twoFactorDuoGet(token, hash)
  }

  const duoTwoFactorActivate = async (
    payload: { host: string; clientId: string; clientSecret: string },
    password?: string,
  ) => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    let hash: string | undefined
    if (password) {
      const hashResult = await masterPasswordHashDeriveForSession(password)
      if (!hashResult.success) return hashResult
      hash = hashResult.data
    }
    return apiClient.twoFactorDuoActivate(token, { ...payload, masterPasswordHash: hash })
  }

  const yubikeyTwoFactorGet = async (password?: string) => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    let hash: string | undefined
    if (password) {
      const hashResult = await masterPasswordHashDeriveForSession(password)
      if (!hashResult.success) return hashResult
      hash = hashResult.data
    }
    return apiClient.twoFactorYubikeyGet(token, hash)
  }

  const yubikeyTwoFactorActivate = async (
    payload: {
      key1?: string | null
      key2?: string | null
      key3?: string | null
      key4?: string | null
      key5?: string | null
      nfc?: boolean
    },
    password?: string,
  ) => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    let hash: string | undefined
    if (password) {
      const hashResult = await masterPasswordHashDeriveForSession(password)
      if (!hashResult.success) return hashResult
      hash = hashResult.data
    }
    return apiClient.twoFactorYubikeyActivate(token, { ...payload, masterPasswordHash: hash })
  }

  const webauthnTwoFactorGet = async (password?: string) => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    let hash: string | undefined
    if (password) {
      const hashResult = await masterPasswordHashDeriveForSession(password)
      if (!hashResult.success) return hashResult
      hash = hashResult.data
    }
    return apiClient.twoFactorWebAuthnGet(token, hash)
  }

  const webauthnTwoFactorChallengeGet = async (password?: string) => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    let hash: string | undefined
    if (password) {
      const hashResult = await masterPasswordHashDeriveForSession(password)
      if (!hashResult.success) return hashResult
      hash = hashResult.data
    }
    return apiClient.twoFactorWebAuthnChallengeGet(token, hash)
  }

  const webauthnTwoFactorActivate = async (
    payload: { id: number | string; name: string; deviceResponse: unknown },
    password?: string,
  ) => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    let hash: string | undefined
    if (password) {
      const hashResult = await masterPasswordHashDeriveForSession(password)
      if (!hashResult.success) return hashResult
      hash = hashResult.data
    }
    return apiClient.twoFactorWebAuthnActivate(token, { ...payload, masterPasswordHash: hash })
  }

  const webauthnTwoFactorDelete = async (id: number | string, password: string) => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    const hashResult = await masterPasswordHashDeriveForSession(password)
    if (!hashResult.success) return hashResult
    return apiClient.twoFactorWebAuthnDelete(token, { id, masterPasswordHash: hashResult.data })
  }

  const deviceVerificationSettingsGet = async () => {
    const token = currentAccessToken()
    if (!token)
      return resultErrorCreate("webAuthSession.twoFactor", "Unauthorized", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    return apiClient.twoFactorDeviceVerificationSettingsGet(token)
  }

  const rememberedDevicesClear = () => {
    const email = session.get()?.email ?? rememberedEmail.get()
    if (email) {
      storage.rememberTokenClear(email)
    }
    return resultCreate(undefined)
  }

  return {
    status: status.get,
    session: session.get,
    rememberedEmail: rememberedEmail.get,
    pendingTwoFactor: pendingTwoFactor.get,
    pendingTwoFactorSet: pendingTwoFactor.set,
    isUnlocked,
    isLocked,
    isUnauthenticated,
    lock,
    logout,
    sessionHandoffAccept,
    unlock,
    login,
    loginTwoFactor,
    register,
    getUserKey: () => inMemoryUserKey,
    masterPasswordHashDeriveForSession,
    providersTwoFactorGet,
    recoverTwoFactorGet,
    providerTwoFactorDisable,
    authenticatorTwoFactorGet,
    authenticatorTwoFactorActivate,
    authenticatorTwoFactorDisable,
    emailTwoFactorLoginSend,
    emailTwoFactorGet,
    emailTwoFactorSend,
    emailTwoFactorActivate,
    duoTwoFactorGet,
    duoTwoFactorActivate,
    yubikeyTwoFactorGet,
    yubikeyTwoFactorActivate,
    webauthnTwoFactorGet,
    webauthnTwoFactorChallengeGet,
    webauthnTwoFactorActivate,
    webauthnTwoFactorDelete,
    deviceVerificationSettingsGet,
    rememberedDevicesClear,
  }
}
