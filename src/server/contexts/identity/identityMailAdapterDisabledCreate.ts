import type { Result } from "#result"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { IdentityMailAdapter } from "./identityMailAdapter.js"

export function identityMailAdapterDisabledCreate(): IdentityMailAdapter {
  const disabled = async (): Promise<Result<void>> =>
    resultErrorCreate("identityMailAdapterDisabledCreate", "Mail delivery is disabled.")
  return {
    sendRegisterVerifyEmail: disabled,
    sendWelcome: disabled,
    sendWelcomeMustVerify: disabled,
    sendChangeEmail: disabled,
    sendChangeEmailInvited: disabled,
    sendChangeEmailExisting: disabled,
    sendVerifyEmail: disabled,
    sendDeleteAccount: disabled,
    sendPasswordHint: disabled,
    sendSendOtp: disabled,
    sendTwoFactorToken: disabled,
    sendProtectedActionToken: disabled,
    sendIncompleteTwoFactorLogin: disabled,
    sendInvite: disabled,
    sendInviteAccepted: disabled,
    sendInviteConfirmed: disabled,
    sendAdminResetPassword: disabled,
    sendTest: disabled,
    sendEmergencyAccessInvite: disabled,
    sendEmergencyAccessInviteAccepted: disabled,
    sendEmergencyAccessInviteConfirmed: disabled,
    sendEmergencyAccessRecoveryInitiated: disabled,
    sendEmergencyAccessRecoveryApproved: disabled,
    sendEmergencyAccessRecoveryRejected: disabled,
    sendEmergencyAccessRecoveryReminder: disabled,
    sendEmergencyAccessRecoveryTimedOut: disabled,
  }
}
