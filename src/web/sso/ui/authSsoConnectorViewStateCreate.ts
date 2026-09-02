import { onCleanup, onMount } from "solid-js"
import type { ResultErr } from "#result"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { base64Decode } from "../../../shared/crypto/base64Decode.js"
import { constantTimeTextEqual } from "../../../shared/crypto/constantTimeTextEqual.js"
import { type WebAuthApiClient, webAuthApiClientCreate } from "../../auth/model/webAuthApiClientCreate.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { webAuthSessionDefault } from "../../auth/model/webAuthSessionDefault.js"
import { webAuthStorageCreate } from "../../auth/model/webAuthStorageCreate.js"
import { webAuthTokenEmailResolve } from "../../auth/model/webAuthTokenEmailResolve.js"
import { webAuthUserIdResolve } from "../../auth/model/webAuthUserIdResolve.js"
import { webSsoCallbackPhaseResolve } from "../model/webSsoCallbackPhaseResolve.js"
import type { WebSsoPendingSetup } from "../model/webSsoPendingSetupSchema.js"
import {
  type WebSsoPendingSetupStorage,
  webSsoPendingSetupStorageCreate,
} from "../model/webSsoPendingSetupStorageCreate.js"
import { webSsoPendingSetupTtlMs } from "../model/webSsoPendingSetupTtlMs.js"
import {
  type WebSsoTransactionStorage,
  webSsoTransactionStorageCreate,
} from "../model/webSsoTransactionStorageCreate.js"

export interface AuthSsoConnectorViewProps {
  session?: ReturnType<typeof webAuthSessionCreate>
  apiClient?: WebAuthApiClient
  storage?: ReturnType<typeof webAuthStorageCreate>
  transactionStorage?: WebSsoTransactionStorage
  pendingSetupStorage?: WebSsoPendingSetupStorage
  onNavigateToUnlock?: () => void
  onNavigateToLogin?: () => void
  onNavigateToVault?: () => void
  navigateReplace?: (path: string) => void
  pathname?: () => string
  search?: () => string
  hash?: () => string
  urlOverride?: string | URL
  nowMs?: number
}

const MAX_SSO_EXCHANGE_RETRIES = 3
const MASTER_PASSWORD_MIN_LENGTH = 8

function providerStateDecode(stateParam: string | null): string | null {
  if (stateParam === null || stateParam === "") return null
  const decoded = base64Decode(stateParam)
  if (!decoded.success) return null
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(decoded.data)
  } catch {
    return null
  }
}

function ssoErrorIsRetryable(result: ResultErr): boolean {
  return (
    result.statusCode === 429 ||
    result.statusCode === 502 ||
    result.statusCode === 503 ||
    result.statusCode === 504 ||
    result.code === "platform.unavailable" ||
    result.code === "platform.rate-limited"
  )
}

export function authSsoConnectorViewStateCreate(props: AuthSsoConnectorViewProps = {}) {
  const session = props.session ?? webAuthSessionDefault()
  const status = createSignalObject<"connecting" | "exchanging" | "setup-required" | "error" | "success">("connecting")
  const errorMessage = createSignalObject<string | null>(null)
  const setupMessage = createSignalObject<string | null>(null)
  const setupErrorMessage = createSignalObject<string | null>(null)
  const isRetryable = createSignalObject(false)
  const retryCount = createSignalObject(0)
  const masterPassword = createSignalObject("")
  const confirmPassword = createSignalObject("")
  const passwordHint = createSignalObject("")
  const showPassword = createSignalObject(false)
  const isSubmitting = createSignalObject(false)
  const setupEmail = createSignalObject<string | null>(null)

  let pendingCode: string | null = null
  let pendingTransactionVerifier: string | null = null
  let pendingSetup: WebSsoPendingSetup | null = null

  const transactionStorage = props.transactionStorage ?? webSsoTransactionStorageCreate()
  const pendingSetupStorage = props.pendingSetupStorage ?? webSsoPendingSetupStorageCreate()

  const nowResolve = (): number => props.nowMs ?? Date.now()

  const setupFormReset = (): void => {
    masterPassword.set("")
    confirmPassword.set("")
    passwordHint.set("")
    setupErrorMessage.set(null)
  }

  const pendingSetupClear = (): void => {
    pendingSetup = null
    setupEmail.set(null)
    pendingSetupStorage.clear()
    setupFormReset()
  }

  const exchangeToken = async (code: string, codeVerifier: string, transactionState: string) => {
    status.set("exchanging")
    errorMessage.set(null)

    const apiClient = props.apiClient ?? webAuthApiClientCreate()
    const storage = props.storage ?? webAuthStorageCreate()

    const tokenResult = await apiClient.ssoLogin({
      code,
      codeVerifier,
      deviceIdentifier: storage.deviceIdentifierGet(),
    })

    if (!tokenResult.success) {
      const retryableFailure = ssoErrorIsRetryable(tokenResult)
      if (retryableFailure && retryCount.get() < MAX_SSO_EXCHANGE_RETRIES) {
        status.set("error")
        errorMessage.set(tokenResult.errorMessage || "SSO login request failed. You can retry.")
        isRetryable.set(true)
        return
      }

      transactionStorage.clear()
      pendingSetupClear()
      isRetryable.set(false)
      pendingCode = null
      pendingTransactionVerifier = null
      status.set("error")
      errorMessage.set(tokenResult.errorMessage || "Failed to exchange SSO authorization code.")
      return
    }

    isRetryable.set(false)
    pendingCode = null
    pendingTransactionVerifier = null
    const token = tokenResult.data

    if (!token.UserDecryptionOptions.HasMasterPassword) {
      const email = webAuthTokenEmailResolve(token.access_token)
      const now = nowResolve()
      if (email === null) {
        transactionStorage.clear()
        status.set("error")
        errorMessage.set("Access token is missing a valid email claim.")
        return
      }
      const candidate: WebSsoPendingSetup = {
        state: transactionState,
        email,
        userId: webAuthUserIdResolve(token.access_token),
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenExpiresAt: now + token.expires_in * 1_000,
        kdf: token.Kdf,
        kdfIterations: token.KdfIterations,
        kdfMemory: token.KdfMemory,
        kdfParallelism: token.KdfParallelism,
        createdAt: now,
        expiresAt: now + webSsoPendingSetupTtlMs,
      }
      const saveResult = pendingSetupStorage.save(candidate)
      transactionStorage.clear()
      if (!saveResult.success) {
        pendingSetupClear()
        status.set("error")
        errorMessage.set(saveResult.errorMessage || "Failed to start first-login setup.")
        return
      }
      pendingSetup = candidate
      setupEmail.set(candidate.email)
      status.set("setup-required")
      setupMessage.set(
        "This is your first login with Single Sign-On. Choose a master password to protect your encrypted vault.",
      )
      return
    }

    const acceptResult = session.ssoSessionAccept(token)
    transactionStorage.clear()

    if (!acceptResult.success) {
      status.set("error")
      errorMessage.set(acceptResult.errorMessage)
      return
    }

    status.set("success")
    if (props.onNavigateToUnlock !== undefined) {
      props.onNavigateToUnlock()
    } else if (props.navigateReplace !== undefined) {
      props.navigateReplace("/unlock")
    } else if (typeof window !== "undefined") {
      window.location.replace("/unlock")
    }
  }

  const processConnector = async () => {
    const currentUrl =
      props.urlOverride !== undefined
        ? new URL(props.urlOverride.toString())
        : typeof window !== "undefined"
          ? new URL(
              `${props.pathname?.() ?? window.location.pathname}${props.search?.() ?? window.location.search}${props.hash?.() ?? window.location.hash}`,
              window.location.origin,
            )
          : new URL("http://localhost/sso-connector.html")

    const origin = currentUrl.origin
    const searchParams = currentUrl.searchParams
    const now = nowResolve()

    const transactionResult = transactionStorage.load(now)

    if (!transactionResult.success || transactionResult.data === null) {
      // No in-flight SSO transaction: a still-valid first-login setup from this tab can be resumed.
      const resumedSetupResult = pendingSetupStorage.load(now)
      if (resumedSetupResult.success && resumedSetupResult.data !== null) {
        pendingSetup = resumedSetupResult.data
        setupEmail.set(resumedSetupResult.data.email)
        status.set("setup-required")
        setupMessage.set(
          "This is your first login with Single Sign-On. Choose a master password to protect your encrypted vault.",
        )
        return
      }
      status.set("error")
      errorMessage.set("SSO session expired or missing. Please return to login and start SSO again.")
      return
    }

    const transaction = transactionResult.data
    const stateParam = searchParams.get("state")

    if (stateParam === null || stateParam === "") {
      transactionStorage.clear()
      status.set("error")
      errorMessage.set("State mismatch: Invalid or expired SSO login session.")
      return
    }

    const decodedProviderState = providerStateDecode(stateParam)
    const isProviderHop =
      decodedProviderState !== null && constantTimeTextEqual(decodedProviderState, transaction.state)

    const isBackendHop =
      !isProviderHop &&
      constantTimeTextEqual(stateParam, transaction.state) &&
      searchParams.get("scope") === "api offline_access" &&
      searchParams.get("iss") === origin &&
      searchParams.has("code")

    if (!isProviderHop && !isBackendHop) {
      transactionStorage.clear()
      status.set("error")
      errorMessage.set("State mismatch: Invalid or expired SSO login session.")
      return
    }

    if (isProviderHop) {
      // First Hop: Provider callback -> Validate standard-base64 state -> Forward to /identity/connect/oidc-signin
      if (!searchParams.has("code") && !searchParams.has("error")) {
        transactionStorage.clear()
        status.set("error")
        errorMessage.set("SSO authorization failed: Invalid provider response.")
        return
      }

      const forwardUrl = new URL("/identity/connect/oidc-signin", origin)
      if (searchParams.has("code")) {
        const code = searchParams.get("code")
        if (code !== null && code !== "") forwardUrl.searchParams.set("code", code)
      }
      if (searchParams.has("error")) {
        const error = searchParams.get("error")
        if (error !== null && error !== "") forwardUrl.searchParams.set("error", error)
      }
      if (searchParams.has("error_description")) {
        const errorDescription = searchParams.get("error_description")
        if (errorDescription !== null && errorDescription !== "") {
          forwardUrl.searchParams.set("error_description", errorDescription)
        }
      }
      forwardUrl.searchParams.set("state", stateParam)

      const forwardPath = `${forwardUrl.pathname}${forwardUrl.search}`
      if (typeof window !== "undefined") {
        window.location.replace(forwardPath)
      }
      return
    }

    // Second Hop: Returned from /identity/connect/oidc-signin -> Scrub query -> Exchange code -> Accept session
    props.navigateReplace?.(currentUrl.pathname)

    const callbackResult = webSsoCallbackPhaseResolve({
      callbackUrl: currentUrl,
      origin,
      nowMs: now,
      transaction,
    })

    if (!callbackResult.success) {
      transactionStorage.clear()
      status.set("error")
      errorMessage.set(callbackResult.errorMessage || "SSO callback validation failed.")
      return
    }

    pendingCode = callbackResult.data.code
    pendingTransactionVerifier = transaction.codeVerifier
    await exchangeToken(callbackResult.data.code, transaction.codeVerifier, transaction.state)
  }

  const retry = () => {
    if (!isRetryable.get() || pendingCode === null || pendingTransactionVerifier === null) return
    const transaction = transactionStorage.load(nowResolve())
    if (!transaction.success || transaction.data === null) {
      isRetryable.set(false)
      status.set("error")
      errorMessage.set("SSO session expired or missing. Please return to login and start SSO again.")
      return
    }
    retryCount.set(retryCount.get() + 1)
    void exchangeToken(pendingCode, pendingTransactionVerifier, transaction.data.state)
  }

  const navigateToLogin = () => {
    transactionStorage.clear()
    pendingSetupClear()
    isRetryable.set(false)
    pendingCode = null
    pendingTransactionVerifier = null
    props.onNavigateToLogin?.()
  }

  const setupCancel = () => {
    pendingSetupClear()
    transactionStorage.clear()
    status.set("error")
    errorMessage.set("First-login setup was cancelled. Please return to login and start SSO again.")
  }

  const togglePasswordVisibility = () => {
    showPassword.set(!showPassword.get())
  }

  const setupSubmit = async (event: SubmitEvent) => {
    event.preventDefault()
    setupErrorMessage.set(null)

    const pending = pendingSetup
    if (pending === null) {
      setupErrorMessage.set("First-login setup expired. Please return to login and start SSO again.")
      return
    }
    if (pending.expiresAt <= nowResolve()) {
      pendingSetupClear()
      status.set("error")
      errorMessage.set("First-login setup expired. Please return to login and start SSO again.")
      return
    }

    const password = masterPassword.get()
    const confirm = confirmPassword.get()
    const hint = passwordHint.get().trim()

    if (password.length < MASTER_PASSWORD_MIN_LENGTH) {
      setupErrorMessage.set(`Master password must be at least ${MASTER_PASSWORD_MIN_LENGTH} characters long.`)
      return
    }
    if (password !== confirm) {
      setupErrorMessage.set("Master passwords do not match.")
      return
    }

    isSubmitting.set(true)
    const setupResult = await session.ssoMasterPasswordSetup({
      email: pending.email,
      userId: pending.userId,
      accessToken: pending.accessToken,
      refreshToken: pending.refreshToken,
      tokenExpiresAt: pending.tokenExpiresAt,
      kdf: pending.kdf,
      kdfIterations: pending.kdfIterations,
      kdfMemory: pending.kdfMemory,
      kdfParallelism: pending.kdfParallelism,
      masterPassword: password,
      masterPasswordHint: hint.length > 0 ? hint : null,
    })
    isSubmitting.set(false)

    if (!setupResult.success) {
      const definitive = !ssoErrorIsRetryable(setupResult)
      if (definitive) {
        pendingSetupClear()
        transactionStorage.clear()
        status.set("error")
        errorMessage.set(setupResult.errorMessage || "Master password setup failed.")
        return
      }
      setupErrorMessage.set(setupResult.errorMessage || "Master password setup failed. Please try again.")
      return
    }

    pendingSetupClear()
    transactionStorage.clear()
    status.set("success")

    if (props.navigateReplace !== undefined) {
      props.navigateReplace("/")
    } else if (props.onNavigateToVault !== undefined) {
      props.onNavigateToVault()
    } else if (typeof window !== "undefined") {
      window.location.replace("/")
    }
  }

  onMount(() => {
    void processConnector()
  })

  onCleanup(() => {
    setupFormReset()
  })

  return {
    status: status.get,
    errorMessage: errorMessage.get,
    setupMessage: setupMessage.get,
    setupErrorMessage: setupErrorMessage.get,
    setupEmail: setupEmail.get,
    isRetryable: isRetryable.get,
    masterPassword: masterPassword.get,
    setMasterPassword: masterPassword.set,
    confirmPassword: confirmPassword.get,
    setConfirmPassword: confirmPassword.set,
    passwordHint: passwordHint.get,
    setPasswordHint: passwordHint.set,
    showPassword: showPassword.get,
    togglePasswordVisibility,
    isSubmitting: isSubmitting.get,
    setupSubmit,
    setupCancel,
    retry,
    processConnector,
    navigateToLogin,
  }
}
