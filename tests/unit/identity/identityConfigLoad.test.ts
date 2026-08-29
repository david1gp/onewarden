import { expect, test } from "bun:test"
import { identityConfigLoad } from "../../../src/server/contexts/identity/identityConfigLoad.js"

test("identityConfigLoad applies task 6 registration defaults", () => {
  expect(identityConfigLoad({})).toEqual({
    success: true,
    data: {
      ORG_CREATION_USERS: "",
      SIGNUPS_ALLOWED: true,
      SIGNUPS_VERIFY: false,
      SIGNUPS_VERIFY_RESEND_TIME: 3600,
      SIGNUPS_VERIFY_RESEND_LIMIT: 6,
      SIGNUPS_DOMAINS_WHITELIST: "",
      INVITATIONS_ALLOWED: true,
      INVITATION_EXPIRATION_HOURS: 120,
      EMERGENCY_ACCESS_ALLOWED: true,
      EMAIL_CHANGE_ALLOWED: true,
      PASSWORD_ITERATIONS: 600000,
      PASSWORD_HINTS_ALLOWED: true,
      SHOW_PASSWORD_HINT: false,
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
      AUTHENTICATOR_DISABLE_TIME_DRIFT: false,
      ENABLE_EMAIL_2FA: false,
      EMAIL_TOKEN_SIZE: 6,
      EMAIL_EXPIRATION_TIME: 600,
      EMAIL_ATTEMPTS_LIMIT: 3,
      INCOMPLETE_2FA_TIME_LIMIT: 3,
      WEBAUTHN_ENABLED: true,
      WEBAUTHN_RP_NAME: "OneWarden",
      DUO_ENABLED: true,
      DUO_HOST: "",
      DUO_IKEY: "",
      DUO_SKEY: "",
      YUBICO_ENABLED: false,
      YUBICO_CLIENT_ID: "",
      YUBICO_SECRET_KEY: "",
      YUBICO_SERVER: "",
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

test("identityConfigLoad validates and normalizes organization creation users", () => {
  expect(identityConfigLoad({ ORG_CREATION_USERS: " ALL " })).toMatchObject({
    success: true,
    data: { ORG_CREATION_USERS: "all" },
  })
  expect(identityConfigLoad({ ORG_CREATION_USERS: "allowed@example.com,invalid" }).success).toBe(false)
})

test("identityConfigLoad rejects partial production two-factor credentials", () => {
  expect(identityConfigLoad({ DUO_HOST: "api.duosecurity.com", DUO_IKEY: "client" }).success).toBe(false)
  expect(identityConfigLoad({ YUBICO_ENABLED: "true", YUBICO_CLIENT_ID: "123456" }).success).toBe(false)
  expect(identityConfigLoad({ YUBICO_CLIENT_ID: "123456", YUBICO_SECRET_KEY: "not-base64" }).success).toBe(false)
  expect(identityConfigLoad({ YUBICO_SERVER: "http://yubico.example" }).success).toBe(false)
  expect(
    identityConfigLoad({
      DUO_HOST: "api.duosecurity.com",
      DUO_IKEY: "client",
      DUO_SKEY: "secret",
      YUBICO_CLIENT_ID: "123456",
      YUBICO_ENABLED: "true",
      YUBICO_SECRET_KEY: "c2VjcmV0",
      YUBICO_SERVER: "https://api.yubico.com",
    }).success,
  ).toBe(true)
})
