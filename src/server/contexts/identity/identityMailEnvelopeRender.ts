import type { IdentityMailEnvelope } from "./identityMailEnvelope.js"
import type { IdentityMailMessage } from "./identityMailMessage.js"

type IdentityMailRenderInput = {
  actingEmail?: string
  daysLeft?: string
  deviceName?: string
  deviceType?: number
  grantorName?: string
  hint?: string
  ipAddress?: string
  kind: IdentityMailMessage["kind"]
  loginTime?: string
  organizationName?: string
  recipient: string
  targetEmail?: string | null
  token?: string | null
  type?: string
  userId?: string | null
  userName?: string
  waitTimeDays?: number
}

const identityMailDefaultOrigin = "https://onewarden.contentoren.de"

export function identityMailEnvelopeRender(
  input: IdentityMailRenderInput,
  publicOrigin?: string,
): IdentityMailEnvelope {
  const webVaultUrl = identityMailWebVaultUrlCreate(publicOrigin)
  switch (input.kind) {
    case "registerVerify": {
      const link = identityMailFragmentUrlCreate(publicOrigin, "#/finish-signup/", {
        email: input.recipient,
        token: input.token ?? "",
      })
      return identityMailEnvelopeCreate(
        input.recipient,
        "Verify Your Email",
        `Verify this email address to finish creating your account by clicking the link below.\n\nVerify Email Address Now: ${link}\n\nIf you did not request to verify your account, you can safely ignore this email.`,
        `<p>Verify this email address to finish creating your account by clicking the link below.</p><p>${identityMailLinkCreate(link, "Verify Email Address Now")}</p><p>If you did not request to verify your account, you can safely ignore this email.</p>`,
      )
    }
    case "welcome":
      return identityMailEnvelopeCreate(
        input.recipient,
        "Welcome",
        `Thank you for creating an account at ${webVaultUrl}. You may now log in with your new account.\n\nIf you did not request to create an account, you can safely ignore this email.`,
        `<p>Thank you for creating an account at ${identityMailLinkCreate(webVaultUrl, webVaultUrl)}. You may now log in with your new account.</p><p>If you did not request to create an account, you can safely ignore this email.</p>`,
      )
    case "welcomeMustVerify": {
      const link = identityMailFragmentUrlCreate(publicOrigin, "#/verify-email/", {
        userId: input.userId ?? "",
        token: input.token ?? "",
      })
      return identityMailEnvelopeCreate(
        input.recipient,
        "Welcome",
        `Thank you for creating an account at ${webVaultUrl}. Before you can log in with your new account, you must verify this email address by clicking the link below.\n\nVerify Email Address Now: ${link}\n\nIf you did not request to create an account, you can safely ignore this email.`,
        `<p>Thank you for creating an account at ${identityMailLinkCreate(webVaultUrl, webVaultUrl)}. Before you can log in with your new account, you must verify this email address by clicking the link below.</p><p>${identityMailLinkCreate(link, "Verify Email Address Now")}</p><p>If you did not request to create an account, you can safely ignore this email.</p>`,
      )
    }
    case "changeEmail":
      return identityMailEnvelopeCreate(
        input.recipient,
        "Your Email Change",
        `To finalize changing your email address enter the following code in the web vault: ${input.token ?? ""}\n\nLog in to the web vault: ${webVaultUrl}\n\nIf you did not try to change your email address, contact your administrator.`,
        `<p>To finalize changing your email address enter the following code in the web vault: <strong>${identityMailHtmlEscape(input.token ?? "")}</strong></p><p>Log in to the web vault: ${identityMailLinkCreate(webVaultUrl, "OneWarden")}</p><p>If you did not try to change your email address, contact your administrator.</p>`,
      )
    case "changeEmailInvited": {
      const link = identityMailFragmentUrlCreate(publicOrigin, "#/recover-delete", {})
      return identityMailEnvelopeCreate(
        input.recipient,
        "Your Email Change",
        `A user (${input.actingEmail ?? ""}) recently tried to change their account to use this email address (${input.recipient}). An account already exists with this email and has been invited to join OneWarden.\n\nRequest account deletion: ${link}\n\nIf you did not try to change an email address, contact your administrator.`,
        `<p>A user (${identityMailHtmlEscape(input.actingEmail ?? "")}) recently tried to change their account to use this email address (${identityMailHtmlEscape(input.recipient)}). An account already exists with this email and has been invited to join OneWarden.</p><p>Request account deletion: ${identityMailLinkCreate(link, "delete the account")}</p><p>If you did not try to change an email address, contact your administrator.</p>`,
      )
    }
    case "changeEmailExisting":
      return identityMailEnvelopeCreate(
        input.recipient,
        "Your Email Change",
        `A user (${input.actingEmail ?? ""}) recently tried to change their account to use this email address (${input.recipient}). An account already exists with this email (${input.recipient}).\n\nIf you did not try to change an email address, contact your administrator.`,
        `<p>A user (${identityMailHtmlEscape(input.actingEmail ?? "")}) recently tried to change their account to use this email address (${identityMailHtmlEscape(input.recipient)}). An account already exists with this email (${identityMailHtmlEscape(input.recipient)}).</p><p>If you did not try to change an email address, contact your administrator.</p>`,
      )
    case "verifyEmail": {
      const link = identityMailFragmentUrlCreate(publicOrigin, "#/verify-email/", {
        userId: input.userId ?? "",
        token: input.token ?? "",
      })
      return identityMailEnvelopeCreate(
        input.recipient,
        "Verify Your Email",
        `Verify this email address for your account by clicking the link below.\n\nVerify Email Address Now: ${link}\n\nIf you did not request to verify your account, you can safely ignore this email.`,
        `<p>Verify this email address for your account by clicking the link below.</p><p>${identityMailLinkCreate(link, "Verify Email Address Now")}</p><p>If you did not request to verify your account, you can safely ignore this email.</p>`,
      )
    }
    case "deleteAccount": {
      const link = identityMailFragmentUrlCreate(publicOrigin, "#/verify-recover-delete", {
        userId: input.userId ?? "",
        token: input.token ?? "",
        email: input.recipient,
      })
      return identityMailEnvelopeCreate(
        input.recipient,
        "Delete Your Account",
        `Click the link below to delete your account.\n\nDelete Your Account: ${link}\n\nIf you did not request this email to delete your account, you can safely ignore this email.`,
        `<p>Click the link below to delete your account.</p><p>${identityMailLinkCreate(link, "Delete Your Account")}</p><p>If you did not request this email to delete your account, you can safely ignore this email.</p>`,
      )
    }
    case "passwordHint": {
      const recoverLink = identityMailFragmentUrlCreate(publicOrigin, "#/recover-delete", {})
      const hint = input.hint ?? ""
      const hintText =
        hint.length === 0
          ? "Unfortunately, your account does not have a master password hint."
          : `Your hint is: *${hint}*`
      const hintHtml =
        hint.length === 0
          ? "Unfortunately, your account does not have a master password hint."
          : `Your hint is: <strong>${identityMailHtmlEscape(hint)}</strong>`
      return identityMailEnvelopeCreate(
        input.recipient,
        "Your master password hint",
        `You (or someone) recently requested your master password hint.\n\n${hintText}\nLog in to the web vault: ${webVaultUrl}\n\nIf you cannot remember your master password, there is no way to recover your data. The only option to gain access to your account again is to delete the account (${recoverLink}) so that you can register again and start over. All data associated with your account will be deleted.\n\nIf you did not request your master password hint you can safely ignore this email.`,
        `<p>You (or someone) recently requested your master password hint.</p><p>${hintHtml}<br />Log in to the web vault: ${identityMailLinkCreate(webVaultUrl, "OneWarden")}</p><p>If you cannot remember your master password, there is no way to recover your data. The only option to gain access to your account again is to ${identityMailLinkCreate(recoverLink, "delete the account")} so that you can register again and start over. All data associated with your account will be deleted.</p><p>If you did not request your master password hint you can safely ignore this email.</p>`,
      )
    }
    case "twoFactorToken":
      return identityMailEnvelopeCreate(
        input.recipient,
        "OneWarden Login Verification Code",
        `Your two-step verification code is: ${input.token ?? ""}\n\nUse this code to complete logging in with OneWarden.`,
        `<p>Your two-step verification code is: <strong>${identityMailHtmlEscape(input.token ?? "")}</strong></p><p>Use this code to complete logging in with OneWarden.</p>`,
      )
    case "protectedActionToken":
      return identityMailEnvelopeCreate(
        input.recipient,
        "Your OneWarden Verification Code",
        `Your email verification code is: ${input.token ?? ""}\n\nUse this code to complete the protected action in OneWarden.`,
        `<p>Your email verification code is: <strong>${identityMailHtmlEscape(input.token ?? "")}</strong></p><p>Use this code to complete the protected action in OneWarden.</p>`,
      )
    case "incompleteTwoFactor":
      return identityMailEnvelopeCreate(
        input.recipient,
        `Incomplete Two-Step Login From ${identityMailHeaderValue(input.deviceName ?? "")}`,
        `Someone attempted to log into your account with the correct master password, but did not provide the correct token or action required to complete the two-step login process.\n\nDate: ${input.loginTime ?? ""}\nIP Address: ${input.ipAddress ?? ""}\nDevice Name: ${input.deviceName ?? ""}\nDevice Type: ${input.deviceType ?? ""}\n\nIf this was not you or someone you authorized, then you should change your master password as soon as possible, as it is likely to be compromised.`,
        `<p>Someone attempted to log into your account with the correct master password, but did not provide the correct token or action required to complete the two-step login process.</p><p><strong>Date:</strong> ${identityMailHtmlEscape(input.loginTime ?? "")}<br /><strong>IP Address:</strong> ${identityMailHtmlEscape(input.ipAddress ?? "")}<br /><strong>Device Name:</strong> ${identityMailHtmlEscape(input.deviceName ?? "")}<br /><strong>Device Type:</strong> ${identityMailHtmlEscape(String(input.deviceType ?? ""))}</p><p>If this was not you or someone you authorized, then you should change your master password as soon as possible, as it is likely to be compromised.</p>`,
      )
    case "invite": {
      const link = identityMailFragmentUrlCreate(publicOrigin, "#/accept-organization/", {
        email: input.recipient,
        organizationName: input.organizationName ?? "",
        organizationUserId: input.targetEmail ?? "",
        token: input.token ?? "",
      })
      const organizationName = input.organizationName ?? "OneWarden"
      return identityMailEnvelopeCreate(
        input.recipient,
        `Join ${identityMailHeaderValue(organizationName)}`,
        `You have been invited to join the *${organizationName}* organization.\n\nClick here to join: ${link}\n\nIf you do not wish to join this organization, you can safely ignore this email.`,
        `<p>You have been invited to join the <strong>${identityMailHtmlEscape(organizationName)}</strong> organization.</p><p>${identityMailLinkCreate(link, "Join Organization Now")}</p><p>If you do not wish to join this organization, you can safely ignore this email.</p>`,
      )
    }
    case "inviteAccepted":
      return identityMailEnvelopeCreate(
        input.recipient,
        `Invitation to ${identityMailHeaderValue(input.organizationName ?? "OneWarden")} accepted`,
        `This email is to notify you that ${input.targetEmail ?? ""} has accepted your invitation to join ${input.organizationName ?? "OneWarden"}.\nPlease log in via ${webVaultUrl} to the OneWarden server and confirm them from the organization management page.`,
        `<p>This email is to notify you that ${identityMailHtmlEscape(input.targetEmail ?? "")} has accepted your invitation to join ${identityMailHtmlEscape(input.organizationName ?? "OneWarden")}.</p><p>Please log in via ${identityMailLinkCreate(webVaultUrl, "OneWarden")} and confirm them from the organization management page.</p>`,
      )
    case "inviteConfirmed":
      return identityMailEnvelopeCreate(
        input.recipient,
        `Invitation to ${identityMailHeaderValue(input.organizationName ?? "OneWarden")} confirmed`,
        `This email is to notify you that you have been confirmed as a user of ${input.organizationName ?? "OneWarden"}.\nAny collections and logins being shared with you by this organization will now appear in your OneWarden vault at ${webVaultUrl}.`,
        `<p>This email is to notify you that you have been confirmed as a user of ${identityMailHtmlEscape(input.organizationName ?? "OneWarden")}.</p><p>Any collections and logins being shared with you by this organization will now appear in your OneWarden vault at ${identityMailLinkCreate(webVaultUrl, "OneWarden")}.</p>`,
      )
    case "adminResetPassword":
      return identityMailEnvelopeCreate(
        input.recipient,
        "Your password was reset by an administrator",
        `An administrator reset the password for ${input.userName ?? input.recipient} in the ${input.organizationName ?? "OneWarden"} organization.\n\nLog in to the web vault: ${webVaultUrl}`,
        `<p>An administrator reset the password for ${identityMailHtmlEscape(input.userName ?? input.recipient)} in the ${identityMailHtmlEscape(input.organizationName ?? "OneWarden")} organization.</p><p>Log in to the web vault: ${identityMailLinkCreate(webVaultUrl, "OneWarden")}</p>`,
      )
    case "smtpTest":
      return identityMailEnvelopeCreate(
        input.recipient,
        "OneWarden SMTP Test",
        `This is a test email to verify the SMTP configuration for ${webVaultUrl}.\n\nWhen you can read this email it is probably configured correctly.`,
        `<p>This is a test email to verify the SMTP configuration for ${identityMailLinkCreate(webVaultUrl, webVaultUrl)}.</p><p>When you can read this email it is probably configured correctly.</p>`,
      )
    case "sendOtp":
      return identityMailEnvelopeCreate(
        input.recipient,
        "OneWarden Send Verification Code",
        `Your OneWarden Send verification code is: ${input.token ?? ""}\n\nEnter this code to access the Send.`,
        `<p>Your OneWarden Send verification code is: <strong>${identityMailHtmlEscape(input.token ?? "")}</strong></p><p>Enter this code to access the Send.</p>`,
      )
    case "emergencyAccessInvite": {
      const link = identityMailFragmentUrlCreate(publicOrigin, "#/accept-emergency/", {
        id: input.targetEmail ?? "",
        name: input.grantorName ?? "",
        email: input.recipient,
        token: input.token ?? "",
      })
      return identityMailEnvelopeCreate(
        input.recipient,
        `Emergency access for ${identityMailHeaderValue(input.grantorName ?? "OneWarden")}`,
        `You have been invited to become an emergency contact for ${input.grantorName ?? "OneWarden"}. To accept this invite, click the following link:\n\nClick here to join: ${link}\n\nIf you do not wish to become an emergency contact, you can safely ignore this email.`,
        `<p>You have been invited to become an emergency contact for ${identityMailHtmlEscape(input.grantorName ?? "OneWarden")}. To accept this invite, click the following link:</p><p>${identityMailLinkCreate(link, "Accept Emergency Access Invite")}</p><p>If you do not wish to become an emergency contact, you can safely ignore this email.</p>`,
      )
    }
    case "emergencyAccessInviteAccepted":
      return identityMailEnvelopeCreate(
        input.recipient,
        `Emergency access contact ${identityMailHeaderValue(input.targetEmail ?? "")} accepted`,
        `This email is to notify you that ${input.targetEmail ?? ""} has accepted your invitation to become an emergency access contact.\n\nTo confirm this user, log into the OneWarden web vault (${webVaultUrl}), go to settings and confirm the user.`,
        `<p>This email is to notify you that ${identityMailHtmlEscape(input.targetEmail ?? "")} has accepted your invitation to become an emergency access contact.</p><p>To confirm this user, log into the OneWarden web vault (${identityMailLinkCreate(webVaultUrl, "OneWarden")}), go to settings and confirm the user.</p>`,
      )
    case "emergencyAccessInviteConfirmed":
      return identityMailEnvelopeCreate(
        input.recipient,
        `Emergency access contact for ${identityMailHeaderValue(input.actingEmail ?? "OneWarden")} confirmed`,
        `This email is to notify you that you have been confirmed as an emergency access contact for ${input.actingEmail ?? "OneWarden"}.\n\nYou can now initiate emergency access requests from the OneWarden web vault (${webVaultUrl}).`,
        `<p>This email is to notify you that you have been confirmed as an emergency access contact for <strong>${identityMailHtmlEscape(input.actingEmail ?? "OneWarden")}</strong>.</p><p>You can now initiate emergency access requests from the OneWarden web vault (${identityMailLinkCreate(webVaultUrl, "OneWarden")}).</p>`,
      )
    case "emergencyAccessRecoveryInitiated":
      return identityMailEnvelopeCreate(
        input.recipient,
        `Emergency access request by ${identityMailHeaderValue(input.actingEmail ?? "")} initiated`,
        `${input.actingEmail ?? ""} has initiated an emergency access request to ${input.type ?? ""} your account. You may log in on the OneWarden web vault (${webVaultUrl}) and manually approve or reject this request.\n\nIf you do nothing, the request will automatically be approved after ${input.waitTimeDays ?? ""} day(s).`,
        `<p>${identityMailHtmlEscape(input.actingEmail ?? "")} has initiated an emergency access request to ${identityMailHtmlEscape(input.type ?? "")} your account. You may log in on the OneWarden web vault (${identityMailLinkCreate(webVaultUrl, "OneWarden")}) and manually approve or reject this request.</p><p>If you do nothing, the request will automatically be approved after ${identityMailHtmlEscape(String(input.waitTimeDays ?? ""))} day(s).</p>`,
      )
    case "emergencyAccessRecoveryApproved":
      return identityMailEnvelopeCreate(
        input.recipient,
        `Emergency access request for ${identityMailHeaderValue(input.actingEmail ?? "")} approved`,
        `${input.actingEmail ?? ""} has approved your emergency access request. You may now log in on the OneWarden web vault (${webVaultUrl}) and access their account.`,
        `<p>${identityMailHtmlEscape(input.actingEmail ?? "")} has approved your emergency access request. You may now log in on the OneWarden web vault (${identityMailLinkCreate(webVaultUrl, "OneWarden")}) and access their account.</p>`,
      )
    case "emergencyAccessRecoveryRejected":
      return identityMailEnvelopeCreate(
        input.recipient,
        `Emergency access request to ${identityMailHeaderValue(input.actingEmail ?? "")} rejected`,
        `${input.actingEmail ?? ""} has rejected your emergency access request.`,
        `<p>${identityMailHtmlEscape(input.actingEmail ?? "")} has rejected your emergency access request.</p>`,
      )
    case "emergencyAccessRecoveryReminder":
      return identityMailEnvelopeCreate(
        input.recipient,
        `Emergency access request by ${identityMailHeaderValue(input.actingEmail ?? "")} is pending`,
        `${input.actingEmail ?? ""} has a pending emergency access request to ${input.type ?? ""} your account. You may log in on the OneWarden web vault (${webVaultUrl}) and manually approve or reject this request.\n\nIf you do nothing, the request will automatically be approved after ${input.daysLeft ?? ""} day(s).`,
        `<p>${identityMailHtmlEscape(input.actingEmail ?? "")} has a pending emergency access request to ${identityMailHtmlEscape(input.type ?? "")} your account. You may log in on the OneWarden web vault (${identityMailLinkCreate(webVaultUrl, "OneWarden")}) and manually approve or reject this request.</p><p>If you do nothing, the request will automatically be approved after ${identityMailHtmlEscape(input.daysLeft ?? "")} day(s).</p>`,
      )
    case "emergencyAccessRecoveryTimedOut":
      return identityMailEnvelopeCreate(
        input.recipient,
        `Emergency access request by ${identityMailHeaderValue(input.actingEmail ?? "")} granted`,
        `${input.actingEmail ?? ""} has been granted emergency access to ${input.type ?? ""} your account. You may log in on the OneWarden web vault (${webVaultUrl}) and manually revoke this request.`,
        `<p>${identityMailHtmlEscape(input.actingEmail ?? "")} has been granted emergency access to ${identityMailHtmlEscape(input.type ?? "")} your account. You may log in on the OneWarden web vault (${identityMailLinkCreate(webVaultUrl, "OneWarden")}) and manually revoke this request.</p>`,
      )
  }
}

function identityMailEnvelopeCreate(
  recipient: string,
  subject: string,
  text: string,
  html: string,
): IdentityMailEnvelope {
  return { html, recipient, subject: identityMailHeaderValue(subject), text: identityMailTextEscape(text) }
}

function identityMailFragmentUrlCreate(
  publicOrigin: string | undefined,
  path: string,
  parameters: Record<string, string>,
): string {
  const url = new URL(new URL(publicOrigin ?? identityMailDefaultOrigin).origin)
  const query = new URLSearchParams(parameters).toString()
  url.hash = query.length === 0 ? path : `${path}?${query}`
  return url.toString()
}

function identityMailHtmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function identityMailHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ")
}

function identityMailTextEscape(value: string): string {
  return value.replace(/<[^>]*>/g, "")
}

function identityMailLinkCreate(url: string, label: string): string {
  return `<a href="${identityMailHtmlEscape(url)}">${identityMailHtmlEscape(label)}</a>`
}

function identityMailWebVaultUrlCreate(publicOrigin: string | undefined): string {
  return new URL("/", new URL(publicOrigin ?? identityMailDefaultOrigin).origin).toString()
}
