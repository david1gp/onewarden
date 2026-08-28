import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { Clock } from "../../../shared/clock/clock.js"
import type { IdentityMailAdapter } from "./identityMailAdapter.js"
import type { IdentityMailMessage } from "./identityMailMessage.js"

export function identityMailAdapterCreate(clock?: Clock): IdentityMailAdapter & { messages: IdentityMailMessage[] } {
  const messages: IdentityMailMessage[] = []
  const timestamp = () => (clock?.now() ?? new Date()).toISOString()
  const record = (
    kind: IdentityMailMessage["kind"],
    recipient: string,
    token: string | null = null,
    userId: string | null = null,
    targetEmail: string | null = null,
    actingEmail?: string,
  ): void => {
    messages.push({
      recipient,
      kind,
      token,
      userId,
      targetEmail,
      timestamp: timestamp(),
      ...(actingEmail === undefined ? {} : { actingEmail }),
    })
  }
  return {
    messages,
    sendRegisterVerifyEmail: async (email, token) => {
      record("registerVerify", email, token)
      return resultCreate(undefined)
    },
    sendWelcome: async (email) => {
      record("welcome", email)
      return resultCreate(undefined)
    },
    sendWelcomeMustVerify: async (email, userId, token) => {
      record("welcomeMustVerify", email, token ?? null, userId)
      return resultCreate(undefined)
    },
    sendChangeEmail: async (email, token, userId) => {
      record("changeEmail", email, token, userId ?? null, email)
      return resultCreate(undefined)
    },
    sendChangeEmailInvited: async (email, actingEmail, userId) => {
      record("changeEmailInvited", email, null, userId ?? null, email, actingEmail)
      return resultCreate(undefined)
    },
    sendChangeEmailExisting: async (email, actingEmail, userId) => {
      record("changeEmailExisting", email, null, userId ?? null, email, actingEmail)
      return resultCreate(undefined)
    },
    sendVerifyEmail: async (email, userId, token) => {
      record("verifyEmail", email, token ?? null, userId)
      return resultCreate(undefined)
    },
    sendDeleteAccount: async (email, userId, token) => {
      record("deleteAccount", email, token ?? null, userId)
      return resultCreate(undefined)
    },
    sendPasswordHint: async (email) => {
      record("passwordHint", email)
      return resultCreate(undefined)
    },
    sendInvite: async () => resultCreate(undefined),
    sendTest: async () => resultCreate(undefined),
    sendEmergencyAccessInvite: async (email, userId, emergencyAccessId, _grantorName, grantorEmail, token) => {
      record("emergencyAccessInvite", email, token, userId, emergencyAccessId, grantorEmail)
      return resultCreate(undefined)
    },
    sendEmergencyAccessInviteAccepted: async (email, granteeEmail) => {
      record("emergencyAccessInviteAccepted", email, null, null, granteeEmail)
      return resultCreate(undefined)
    },
    sendEmergencyAccessInviteConfirmed: async (email, grantorName) => {
      record("emergencyAccessInviteConfirmed", email, null, null, null, grantorName)
      return resultCreate(undefined)
    },
    sendEmergencyAccessRecoveryInitiated: async (email, granteeName, type, waitTimeDays) => {
      record("emergencyAccessRecoveryInitiated", email, null, null, `${type}:${waitTimeDays}`, granteeName)
      return resultCreate(undefined)
    },
    sendEmergencyAccessRecoveryApproved: async (email, grantorName) => {
      record("emergencyAccessRecoveryApproved", email, null, null, null, grantorName)
      return resultCreate(undefined)
    },
    sendEmergencyAccessRecoveryRejected: async (email, grantorName) => {
      record("emergencyAccessRecoveryRejected", email, null, null, null, grantorName)
      return resultCreate(undefined)
    },
    sendEmergencyAccessRecoveryReminder: async (email, granteeName, type, daysLeft) => {
      record("emergencyAccessRecoveryReminder", email, null, null, `${type}:${daysLeft}`, granteeName)
      return resultCreate(undefined)
    },
    sendEmergencyAccessRecoveryTimedOut: async (email, granteeName, type) => {
      record("emergencyAccessRecoveryTimedOut", email, null, null, type, granteeName)
      return resultCreate(undefined)
    },
  }
}
