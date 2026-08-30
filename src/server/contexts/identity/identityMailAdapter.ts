import type { Result } from "#result"
import type { IdentityMailMessage } from "./identityMailMessage.js"

export type IdentityMailAdapter = {
  messages?: IdentityMailMessage[]
  sendRegisterVerifyEmail: (email: string, token: string) => Promise<Result<void>>
  sendWelcome: (email: string) => Promise<Result<void>>
  sendWelcomeMustVerify: (email: string, userId: string, token?: string) => Promise<Result<void>>
  sendChangeEmail?: (email: string, token: string, userId?: string) => Promise<Result<void>>
  sendChangeEmailInvited?: (email: string, actingEmail: string, userId?: string) => Promise<Result<void>>
  sendChangeEmailExisting?: (email: string, actingEmail: string, userId?: string) => Promise<Result<void>>
  sendVerifyEmail?: (email: string, userId: string, token?: string) => Promise<Result<void>>
  sendDeleteAccount?: (email: string, userId: string, token?: string) => Promise<Result<void>>
  sendPasswordHint?: (email: string, hint: string | null) => Promise<Result<void>>
  sendTwoFactorToken?: (email: string, token: string) => Promise<Result<void>>
  sendProtectedActionToken?: (email: string, token: string) => Promise<Result<void>>
  sendIncompleteTwoFactorLogin?: (
    email: string,
    ipAddress: string,
    loginTime: string,
    deviceName: string,
    deviceType: number,
  ) => Promise<Result<void>>
  sendInvite?: (email: string, organizationName: string, memberId: string, token?: string) => Promise<Result<void>>
  sendInviteAccepted?: (newUserEmail: string, address: string, organizationName: string) => Promise<Result<void>>
  sendInviteConfirmed?: (address: string, organizationName: string) => Promise<Result<void>>
  sendAdminResetPassword?: (email: string, userName: string, organizationName: string) => Promise<Result<void>>
  sendTest?: (email: string) => Promise<Result<void>>
  sendEmergencyAccessInvite?: (
    email: string,
    userId: string,
    emergencyAccessId: string,
    grantorName: string,
    grantorEmail: string,
    token: string,
  ) => Promise<Result<void>>
  sendEmergencyAccessInviteAccepted?: (email: string, granteeEmail: string) => Promise<Result<void>>
  sendEmergencyAccessInviteConfirmed?: (email: string, grantorName: string) => Promise<Result<void>>
  sendEmergencyAccessRecoveryInitiated?: (
    email: string,
    granteeName: string,
    type: string,
    waitTimeDays: number,
  ) => Promise<Result<void>>
  sendEmergencyAccessRecoveryApproved?: (email: string, grantorName: string) => Promise<Result<void>>
  sendEmergencyAccessRecoveryRejected?: (email: string, grantorName: string) => Promise<Result<void>>
  sendEmergencyAccessRecoveryReminder?: (
    email: string,
    granteeName: string,
    type: string,
    daysLeft: string,
  ) => Promise<Result<void>>
  sendEmergencyAccessRecoveryTimedOut?: (email: string, granteeName: string, type: string) => Promise<Result<void>>
}
