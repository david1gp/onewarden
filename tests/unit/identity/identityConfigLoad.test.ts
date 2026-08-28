import { expect, test } from "bun:test"
import { identityConfigLoad } from "../../../src/server/contexts/identity/identityConfigLoad.js"

test("identityConfigLoad applies task 6 registration defaults", () => {
  expect(identityConfigLoad({})).toEqual({
    success: true,
    data: {
      SIGNUPS_ALLOWED: true,
      SIGNUPS_VERIFY: false,
      SIGNUPS_VERIFY_RESEND_TIME: 3600,
      SIGNUPS_VERIFY_RESEND_LIMIT: 6,
      SIGNUPS_DOMAINS_WHITELIST: "",
      INVITATIONS_ALLOWED: true,
      INVITATION_EXPIRATION_HOURS: 120,
      EMERGENCY_ACCESS_ALLOWED: true,
      PASSWORD_ITERATIONS: 600000,
      PASSWORD_HINTS_ALLOWED: true,
      MAIL_ENABLED: false,
      SSO_ENABLED: false,
      SSO_ONLY: false,
      SSO_SIGNUPS_MATCH_EMAIL: true,
      SSO_ALLOW_UNKNOWN_EMAIL_VERIFICATION: false,
      SSO_CLIENT_ID: "",
      SSO_CLIENT_SECRET: "",
      SSO_AUTHORITY: "",
      SSO_SCOPES: "email profile",
      SSO_AUTHORIZE_EXTRA_PARAMS: "",
      SSO_PKCE: true,
      SSO_AUTH_ONLY_NOT_SESSION: false,
      DISABLE_2FA_REMEMBER: false,
      UNAUTHENTICATED_RATELIMIT_SECONDS: 60,
      UNAUTHENTICATED_RATELIMIT_MAX_BURST: 50,
    },
  })
})

test("identityConfigLoad parses registration capability and mail settings", () => {
  expect(
    identityConfigLoad({
      EMERGENCY_ACCESS_ALLOWED: "false",
      MAIL_ENABLED: "true",
      PASSWORD_ITERATIONS: "100000",
      SIGNUPS_ALLOWED: "false",
      SIGNUPS_DOMAINS_WHITELIST: " example.com,EXAMPLE.NET ",
      SIGNUPS_VERIFY: "true",
    }),
  ).toMatchObject({
    success: true,
    data: {
      EMERGENCY_ACCESS_ALLOWED: false,
      MAIL_ENABLED: true,
      PASSWORD_ITERATIONS: 100000,
      SIGNUPS_ALLOWED: false,
      SIGNUPS_DOMAINS_WHITELIST: "example.com,EXAMPLE.NET",
      SIGNUPS_VERIFY: true,
    },
  })
})

test("identityConfigLoad rejects invalid resend and emergency values", () => {
  expect(identityConfigLoad({ EMERGENCY_ACCESS_ALLOWED: "yes" }).success).toBe(false)
  expect(identityConfigLoad({ SIGNUPS_VERIFY_RESEND_TIME: "-1" }).success).toBe(false)
  expect(identityConfigLoad({ SIGNUPS_VERIFY_RESEND_LIMIT: "0" }).success).toBe(true)
})
