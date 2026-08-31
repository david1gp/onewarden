import * as v from "valibot"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { type WebAuthApiClient, webAuthApiClientCreate } from "../model/webAuthApiClientCreate.js"
import { webAuthVerificationUserIdResolve } from "../model/webAuthVerificationUserIdResolve.js"
import { type AuthVerifyEmailUrlQuery, authVerifyEmailUrlQuerySchema } from "./authVerifyEmailUrlQuerySchema.js"

export interface AuthVerifyEmailViewProps {
  apiClient?: WebAuthApiClient
  initialUserId?: string
  initialToken?: string
  initialEmail?: string
  onSuccess?: () => void
  onNavigateToLogin?: () => void
}

function urlQueryParamsRead(): AuthVerifyEmailUrlQuery {
  if (typeof window === "undefined") return { userId: "", token: "", email: "" }
  try {
    const params = new URLSearchParams(window.location.search)
    return {
      userId:
        urlQueryParamRead(
          authVerifyEmailUrlQuerySchema.entries.userId,
          params.get("userId") ?? params.get("user_id"),
        ) ?? "",
      token: urlQueryParamRead(authVerifyEmailUrlQuerySchema.entries.token, params.get("token")) ?? "",
      email: urlQueryParamRead(authVerifyEmailUrlQuerySchema.entries.email, params.get("email")) ?? "",
    }
  } catch {
    return { userId: "", token: "", email: "" }
  }
}

function urlQueryParamRead<TSchema extends v.GenericSchema>(
  schema: TSchema,
  value: string | null,
): v.InferOutput<TSchema> | undefined {
  if (value === null) return undefined
  const parsed = v.safeParse(schema, value)
  return parsed.success ? parsed.output : undefined
}

export function authVerifyEmailViewStateCreate(props: AuthVerifyEmailViewProps = {}) {
  const apiClient = props.apiClient ?? webAuthApiClientCreate()
  const initialParams = urlQueryParamsRead()
  const initialToken = props.initialToken ?? initialParams.token
  const initialUserId =
    (props.initialUserId ?? initialParams.userId) || webAuthVerificationUserIdResolve(initialToken) || ""

  const userId = createSignalObject(initialUserId)
  const token = createSignalObject(initialToken)
  const resendEmail = createSignalObject(props.initialEmail ?? initialParams.email)
  const errorMessage = createSignalObject<string | null>(null)
  const successMessage = createSignalObject<string | null>(null)
  const isSubmitting = createSignalObject(false)
  const isResending = createSignalObject(false)

  const handleVerify = async (event: SubmitEvent) => {
    event.preventDefault()
    errorMessage.set(null)
    successMessage.set(null)

    const trimmedUserId = userId.get().trim()
    const trimmedToken = token.get().trim()

    if (trimmedUserId === "") {
      errorMessage.set("Please enter your User ID.")
      return
    }
    if (trimmedToken === "") {
      errorMessage.set("Please enter your verification token.")
      return
    }

    isSubmitting.set(true)
    const result = await apiClient.verifyEmailToken({
      userId: trimmedUserId,
      token: trimmedToken,
    })
    isSubmitting.set(false)

    if (!result.success) {
      errorMessage.set(result.errorMessage || "Verification failed. The token may be expired or invalid.")
      return
    }

    successMessage.set("Email address verified successfully! You can now log in.")
    props.onSuccess?.()
  }

  const handleResend = async () => {
    errorMessage.set(null)
    successMessage.set(null)

    const email = resendEmail.get().trim()
    if (email === "" || !email.includes("@")) {
      errorMessage.set("Please enter a valid email address to resend verification.")
      return
    }

    isResending.set(true)
    const result = await apiClient.sendVerificationEmail({ email })
    isResending.set(false)

    if (!result.success) {
      errorMessage.set(result.errorMessage || "Failed to send verification email.")
      return
    }

    if (result.data.token && result.data.userId) {
      userId.set(result.data.userId)
      token.set(result.data.token)
      successMessage.set("Verification email sent. Your User ID and token are ready to submit.")
    } else if (result.data.token) {
      successMessage.set("Verification email sent. Check your inbox for the User ID and verification token.")
    } else {
      successMessage.set("Verification email sent! Check your inbox.")
    }
  }

  return {
    userId: userId.get,
    setUserId: userId.set,
    token: token.get,
    setToken: (value: string) => {
      token.set(value)
      if (userId.get().trim() === "") {
        const resolvedUserId = webAuthVerificationUserIdResolve(value)
        if (resolvedUserId !== null) userId.set(resolvedUserId)
      }
    },
    resendEmail: resendEmail.get,
    setResendEmail: resendEmail.set,
    errorMessage: errorMessage.get,
    successMessage: successMessage.get,
    isSubmitting: isSubmitting.get,
    isResending: isResending.get,
    handleVerify,
    handleResend,
    navigateToLogin: () => props.onNavigateToLogin?.(),
  }
}
