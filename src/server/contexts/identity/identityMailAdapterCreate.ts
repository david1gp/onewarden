import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { IdentityMailAdapter } from "./identityMailAdapter.js"
import { identityMailEnvelopeRender } from "./identityMailEnvelopeRender.js"
import type { IdentityMailMessage } from "./identityMailMessage.js"

export function identityMailAdapterCreate(
  clock?: Clock,
  publicOrigin?: string,
): IdentityMailAdapter & { messages: IdentityMailMessage[] } {
  const messages: IdentityMailMessage[] = []
  const timestamp = () => (clock?.now() ?? new Date()).toISOString()
  const record = (input: Parameters<typeof identityMailEnvelopeRender>[0]): void => {
    const envelope = identityMailEnvelopeRender(input, publicOrigin)
    messages.push({
      ...envelope,
      kind: input.kind,
      targetEmail: input.targetEmail ?? null,
      timestamp: timestamp(),
      token: input.token ?? null,
      userId: input.userId ?? null,
      ...(input.actingEmail === undefined ? {} : { actingEmail: input.actingEmail }),
      ...(input.deviceName === undefined ? {} : { deviceName: input.deviceName }),
      ...(input.deviceType === undefined ? {} : { deviceType: input.deviceType }),
      ...(input.ipAddress === undefined ? {} : { ipAddress: input.ipAddress }),
      ...(input.loginTime === undefined ? {} : { loginTime: input.loginTime }),
      ...(input.organizationName === undefined ? {} : { organizationName: input.organizationName }),
      ...(input.userName === undefined ? {} : { userName: input.userName }),
    })
  }
  return {
    messages,
    sendRegisterVerifyEmail: async (email, token) => {
      record({ kind: "registerVerify", recipient: email, token })
      return resultCreate(undefined)
    },
    sendWelcome: async (email) => {
      record({ kind: "welcome", recipient: email })
      return resultCreate(undefined)
    },
    sendWelcomeMustVerify: async (email, userId, token) => {
      record({ kind: "welcomeMustVerify", recipient: email, token: token ?? null, userId })
      return resultCreate(undefined)
    },
    sendChangeEmail: async (email, token, userId) => {
      record({ kind: "changeEmail", recipient: email, targetEmail: email, token, userId: userId ?? null })
      return resultCreate(undefined)
    },
    sendChangeEmailInvited: async (email, actingEmail, userId) => {
      record({
        actingEmail,
        kind: "changeEmailInvited",
        recipient: email,
        targetEmail: email,
        userId: userId ?? null,
      })
      return resultCreate(undefined)
    },
    sendChangeEmailExisting: async (email, actingEmail, userId) => {
      record({
        actingEmail,
        kind: "changeEmailExisting",
        recipient: email,
        targetEmail: email,
        userId: userId ?? null,
      })
      return resultCreate(undefined)
    },
    sendVerifyEmail: async (email, userId, token) => {
      record({ kind: "verifyEmail", recipient: email, token: token ?? null, userId })
      return resultCreate(undefined)
    },
    sendDeleteAccount: async (email, userId, token) => {
      record({ kind: "deleteAccount", recipient: email, token: token ?? null, userId })
      return resultCreate(undefined)
    },
    sendPasswordHint: async (email, hint) => {
      record({ hint: hint ?? "", kind: "passwordHint", recipient: email })
      return resultCreate(undefined)
    },
    sendSendOtp: async (email, token) => {
      record({ kind: "sendOtp", recipient: email, token })
      return resultCreate(undefined)
    },
    sendTwoFactorToken: async (email, token) => {
      record({ kind: "twoFactorToken", recipient: email, token })
      return resultCreate(undefined)
    },
    sendProtectedActionToken: async (email, token) => {
      record({ kind: "protectedActionToken", recipient: email, token })
      return resultCreate(undefined)
    },
    sendIncompleteTwoFactorLogin: async (email, ipAddress, loginTime, deviceName, deviceType) => {
      record({ deviceName, deviceType, ipAddress, kind: "incompleteTwoFactor", loginTime, recipient: email })
      return resultCreate(undefined)
    },
    sendInvite: async (email, organizationName, memberId, token) => {
      record({
        kind: "invite",
        organizationName,
        recipient: email,
        targetEmail: memberId,
        token: token ?? null,
      })
      return resultCreate(undefined)
    },
    sendInviteAccepted: async (newUserEmail, address, organizationName) => {
      record({
        kind: "inviteAccepted",
        organizationName,
        recipient: address,
        targetEmail: newUserEmail,
      })
      return resultCreate(undefined)
    },
    sendInviteConfirmed: async (address, organizationName) => {
      record({ kind: "inviteConfirmed", organizationName, recipient: address })
      return resultCreate(undefined)
    },
    sendAdminResetPassword: async (email, userName, organizationName) => {
      record({ kind: "adminResetPassword", organizationName, recipient: email, userName })
      return resultCreate(undefined)
    },
    sendTest: async (email) => {
      record({ kind: "smtpTest", recipient: email })
      return resultCreate(undefined)
    },
    sendEmergencyAccessInvite: async (email, userId, emergencyAccessId, grantorName, grantorEmail, token) => {
      record({
        actingEmail: grantorEmail,
        grantorName,
        kind: "emergencyAccessInvite",
        recipient: email,
        targetEmail: emergencyAccessId,
        token,
        userId,
      })
      return resultCreate(undefined)
    },
    sendEmergencyAccessInviteAccepted: async (email, granteeEmail) => {
      record({ kind: "emergencyAccessInviteAccepted", recipient: email, targetEmail: granteeEmail })
      return resultCreate(undefined)
    },
    sendEmergencyAccessInviteConfirmed: async (email, grantorName) => {
      record({ actingEmail: grantorName, kind: "emergencyAccessInviteConfirmed", recipient: email })
      return resultCreate(undefined)
    },
    sendEmergencyAccessRecoveryInitiated: async (email, granteeName, type, waitTimeDays) => {
      record({
        actingEmail: granteeName,
        kind: "emergencyAccessRecoveryInitiated",
        recipient: email,
        targetEmail: `${type}:${waitTimeDays}`,
        type,
        waitTimeDays,
      })
      return resultCreate(undefined)
    },
    sendEmergencyAccessRecoveryApproved: async (email, grantorName) => {
      record({ actingEmail: grantorName, kind: "emergencyAccessRecoveryApproved", recipient: email })
      return resultCreate(undefined)
    },
    sendEmergencyAccessRecoveryRejected: async (email, grantorName) => {
      record({ actingEmail: grantorName, kind: "emergencyAccessRecoveryRejected", recipient: email })
      return resultCreate(undefined)
    },
    sendEmergencyAccessRecoveryReminder: async (email, granteeName, type, daysLeft) => {
      record({
        actingEmail: granteeName,
        daysLeft,
        kind: "emergencyAccessRecoveryReminder",
        recipient: email,
        targetEmail: `${type}:${daysLeft}`,
        type,
      })
      return resultCreate(undefined)
    },
    sendEmergencyAccessRecoveryTimedOut: async (email, granteeName, type) => {
      record({
        actingEmail: granteeName,
        kind: "emergencyAccessRecoveryTimedOut",
        recipient: email,
        targetEmail: type,
        type,
      })
      return resultCreate(undefined)
    },
  }
}
