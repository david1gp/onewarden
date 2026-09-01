import { createMemo, onCleanup } from "solid-js"
import * as v from "valibot"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionFullWindowCommands } from "../fullwindow/ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowEnvironmentSettings } from "../fullwindow/ExtensionFullWindowEnvironmentSettings.js"
import { extensionFullWindowUrlSignalCreate } from "../fullwindow/extensionFullWindowUrlSignalCreate.js"
import { extensionAccountFlowSchema } from "./extensionAccountFlowSchema.js"
import { extensionAccountPasswordSetupRequestSchema } from "./extensionAccountPasswordSetupRequestSchema.js"
import { extensionAccountRegisterRequestSchema } from "./extensionAccountRegisterRequestSchema.js"
import { extensionAccountVerificationEmailSendRequestSchema } from "./extensionAccountVerificationEmailSendRequestSchema.js"
import { extensionAccountVerifyRequestSchema } from "./extensionAccountVerifyRequestSchema.js"

export function extensionAccountAuthViewStateCreate(options: {
  commands: () => ExtensionFullWindowCommands
  environment: () => ExtensionFullWindowEnvironmentSettings
  onLogin: (email: string) => void
  onSettings: () => void
}) {
  const query = new URLSearchParams(window.location.search)
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""))
  const initialEmail = (query.get("email") ?? "").slice(0, 320)
  const initialAccessToken = (fragment.get("access_token") ?? "").slice(0, 16_384)
  const flowSignal = extensionFullWindowUrlSignalCreate(
    "flow",
    initialAccessToken === "" ? "register" : "password-setup",
    extensionAccountFlowSchema,
  )
  const emailSignal = createSignalObject(initialEmail)
  const nameSignal = createSignalObject("")
  const passwordSignal = createSignalObject("")
  const passwordConfirmSignal = createSignalObject("")
  const passwordHintSignal = createSignalObject("")
  const userIdSignal = createSignalObject((query.get("userId") ?? query.get("user_id") ?? "").slice(0, 128))
  const tokenSignal = createSignalObject((query.get("token") ?? "").slice(0, 8_192))
  const accessTokenSignal = createSignalObject(initialAccessToken)
  const busySignal = createSignalObject(false)
  const errorSignal = createSignalObject<string | null>(null)
  const successSignal = createSignalObject<string | null>(null)
  let retryAction: (() => Promise<void>) | null = null
  if (initialAccessToken !== "") {
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`)
  }

  const flowIs = (flow: string) => createMemo(() => flowSignal.get() === flow)
  const isRegister = flowIs("register")
  const isVerify = flowIs("verify")
  const isPasswordSetup = flowIs("password-setup")
  const statusClear = () => {
    errorSignal.set(null)
    successSignal.set(null)
    retryAction = null
  }
  const flowOpen = (flow: "register" | "verify" | "password-setup") => {
    statusClear()
    passwordSignal.set("")
    passwordConfirmSignal.set("")
    accessTokenSignal.set("")
    if (flow !== "verify") tokenSignal.set("")
    flowSignal.set(flow)
  }
  const registerOpen = () => flowOpen("register")
  const verifyOpen = () => flowOpen("verify")
  const passwordSetupOpen = () => flowOpen("password-setup")
  const errorSet = (message: string, retry: () => Promise<void>) => {
    errorSignal.set(message)
    successSignal.set(null)
    retryAction = retry
  }
  const successSet = (message: string) => {
    successSignal.set(message)
    errorSignal.set(null)
    retryAction = null
  }

  const accountRegister = async (): Promise<void> => {
    if (busySignal.get()) return
    if (passwordSignal.get() !== passwordConfirmSignal.get()) {
      errorSet("Master passwords do not match.", accountRegister)
      return
    }
    const parsed = v.safeParse(extensionAccountRegisterRequestSchema, {
      email: emailSignal.get(),
      masterPassword: passwordSignal.get(),
      masterPasswordHint: passwordHintSignal.get() || null,
      name: nameSignal.get() || null,
    })
    if (!parsed.success) {
      errorSet(parsed.issues[0]?.message ?? "Check the registration details.", accountRegister)
      return
    }
    busySignal.set(true)
    statusClear()
    const result = await options.commands().accountRegister(parsed.output, options.environment())
    busySignal.set(false)
    if (!result.success) {
      errorSet(result.errorMessage ?? "Account registration failed.", accountRegister)
      return
    }
    passwordSignal.set("")
    passwordConfirmSignal.set("")
    flowSignal.set("verify")
    successSet("Account created. Verify your email if required, then continue to login.")
  }

  const verificationEmailSend = async (): Promise<void> => {
    if (busySignal.get()) return
    const parsed = v.safeParse(extensionAccountVerificationEmailSendRequestSchema, {
      email: emailSignal.get(),
      name: nameSignal.get() || null,
    })
    if (!parsed.success) {
      errorSet(parsed.issues[0]?.message ?? "Enter a valid email address.", verificationEmailSend)
      return
    }
    busySignal.set(true)
    statusClear()
    const result = await options.commands().accountVerificationEmailSend(parsed.output, options.environment())
    busySignal.set(false)
    if (!result.success) {
      errorSet(result.errorMessage ?? "Verification email could not be sent.", verificationEmailSend)
      return
    }
    if (result.data.userId !== undefined) userIdSignal.set(result.data.userId)
    if (result.data.token !== undefined) tokenSignal.set(result.data.token)
    successSet("Verification email sent. Check your inbox and enter the verification details below.")
  }

  const accountVerify = async (): Promise<void> => {
    if (busySignal.get()) return
    const parsed = v.safeParse(extensionAccountVerifyRequestSchema, {
      userId: userIdSignal.get(),
      token: tokenSignal.get(),
    })
    if (!parsed.success) {
      errorSet("User ID and verification token are required.", accountVerify)
      return
    }
    busySignal.set(true)
    statusClear()
    const result = await options.commands().accountVerify(parsed.output, options.environment())
    busySignal.set(false)
    if (!result.success) {
      errorSet(result.errorMessage ?? "Email verification failed.", accountVerify)
      return
    }
    tokenSignal.set("")
    successSet("Email verified. You can now log in.")
  }

  const accountPasswordSetup = async (): Promise<void> => {
    if (busySignal.get()) return
    if (passwordSignal.get() !== passwordConfirmSignal.get()) {
      errorSet("Master passwords do not match.", accountPasswordSetup)
      return
    }
    const parsed = v.safeParse(extensionAccountPasswordSetupRequestSchema, {
      accessToken: accessTokenSignal.get(),
      email: emailSignal.get(),
      masterPassword: passwordSignal.get(),
      masterPasswordHint: passwordHintSignal.get() || null,
    })
    if (!parsed.success) {
      errorSet(parsed.issues[0]?.message ?? "Check the password setup details.", accountPasswordSetup)
      return
    }
    busySignal.set(true)
    statusClear()
    const result = await options.commands().accountPasswordSetup(parsed.output, options.environment())
    busySignal.set(false)
    if (!result.success) {
      errorSet(result.errorMessage ?? "Master password setup failed.", accountPasswordSetup)
      return
    }
    passwordSignal.set("")
    passwordConfirmSignal.set("")
    accessTokenSignal.set("")
    successSet("Master password set. Continue to login to unlock your vault safely.")
  }

  const retry = () => void retryAction?.()
  const loginContinue = () => options.onLogin(emailSignal.get().trim().toLowerCase())
  onCleanup(() => {
    passwordSignal.set("")
    passwordConfirmSignal.set("")
    accessTokenSignal.set("")
    tokenSignal.set("")
  })

  return {
    flowSignal,
    emailSignal,
    nameSignal,
    passwordSignal,
    passwordConfirmSignal,
    passwordHintSignal,
    userIdSignal,
    tokenSignal,
    accessTokenSignal,
    busy: busySignal.get,
    errorMessage: errorSignal.get,
    successMessage: successSignal.get,
    isRegister,
    isVerify,
    isPasswordSetup,
    registerOpen,
    verifyOpen,
    passwordSetupOpen,
    accountRegister,
    verificationEmailSend,
    accountVerify,
    accountPasswordSetup,
    retry,
    loginContinue,
    settingsOpen: options.onSettings,
  }
}
