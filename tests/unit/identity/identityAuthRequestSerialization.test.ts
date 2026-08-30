import { expect, test } from "bun:test"
import type { IdentityAuthRequest } from "../../../src/server/contexts/identity/identityAuthRequest.js"
import { identityAuthRequestAccessCodeCheck } from "../../../src/server/contexts/identity/identityAuthRequestAccessCodeCheck.js"
import { identityAuthRequestCreate } from "../../../src/server/contexts/identity/identityAuthRequestCreate.js"
import { identityAuthRequestPendingDeviceToJson } from "../../../src/server/contexts/identity/identityAuthRequestPendingDeviceToJson.js"
import { identityAuthRequestToJson } from "../../../src/server/contexts/identity/identityAuthRequestToJson.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityDeviceWithAuthRequestToJson } from "../../../src/server/contexts/identity/identityDeviceWithAuthRequestToJson.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"

function authRequestCreate(overrides: Partial<IdentityAuthRequest> = {}): IdentityAuthRequest {
  return {
    uuid: "auth-request-json",
    userUuid: "auth-request-user",
    organizationUuid: null,
    requestDeviceIdentifier: "request-device",
    deviceType: 7,
    requestIp: "192.0.2.20",
    responseDeviceId: null,
    accessCode: "correct-access-code",
    publicKey: "public-key",
    encKey: "encrypted-key",
    masterPasswordHash: "master-password-hash",
    approved: true,
    creationDate: "2026-08-28T00:00:00.000Z",
    responseDate: "2026-08-28T00:01:00.000Z",
    authenticationDate: "2026-08-28T00:02:00.000Z",
    ...overrides,
  }
}

function deviceCreate(): IdentityDevice {
  return {
    uuid: "device-json",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    userUuid: "auth-request-user",
    name: "Device JSON",
    type: 7,
    pushUuid: "device-push",
    pushToken: null,
    refreshToken: "device-refresh",
    twoFactorRemember: null,
  }
}

test("auth request creation initializes upstream defaults and timestamps", () => {
  expect(
    identityAuthRequestCreate(
      "auth-request-user",
      "request-device",
      7,
      "192.0.2.20",
      "access-code",
      "public-key",
      clockTestCreate("2026-08-28T00:00:00.000Z"),
      identifierTestCreate(["auth-request-created"]),
    ),
  ).toEqual({
    success: true,
    data: {
      uuid: "auth-request-created",
      userUuid: "auth-request-user",
      organizationUuid: null,
      requestDeviceIdentifier: "request-device",
      deviceType: 7,
      requestIp: "192.0.2.20",
      responseDeviceId: null,
      accessCode: "access-code",
      publicKey: "public-key",
      encKey: null,
      masterPasswordHash: null,
      approved: null,
      creationDate: "2026-08-28T00:00:00.000Z",
      responseDate: null,
      authenticationDate: null,
    },
  })
})

test("auth request access-code comparison is exact and constant-time", () => {
  const request = authRequestCreate()
  expect(identityAuthRequestAccessCodeCheck(request, "correct-access-code")).toBe(true)
  expect(identityAuthRequestAccessCodeCheck(request, "incorrect-access-code")).toBe(false)
  expect(identityAuthRequestAccessCodeCheck(request, "correct-access-code\u0000")).toBe(false)
})

test("auth request serializers preserve the full and pending-device JSON contracts", () => {
  const request = authRequestCreate()
  expect(identityAuthRequestToJson(request, "https://vault.example")).toEqual({
    id: "auth-request-json",
    publicKey: "public-key",
    requestDeviceType: "macOS",
    requestIpAddress: "192.0.2.20",
    key: "encrypted-key",
    masterPasswordHash: "master-password-hash",
    creationDate: "2026-08-28T00:00:00.000Z",
    responseDate: "2026-08-28T00:01:00.000Z",
    requestApproved: true,
    origin: "https://vault.example",
    object: "auth-request",
  })
  expect(identityAuthRequestPendingDeviceToJson(request)).toEqual({
    id: "auth-request-json",
    creationDate: "2026-08-28T00:00:00.000Z",
  })
  expect(
    identityAuthRequestToJson(
      authRequestCreate({ encKey: null, masterPasswordHash: null, approved: null, responseDate: null }),
      "https://vault.example",
    ),
  ).toMatchObject({ key: null, masterPasswordHash: null, responseDate: null, requestApproved: null })
})

test("device list serializer includes only the abbreviated pending auth request", () => {
  const device = deviceCreate()
  const pendingAuthRequest = authRequestCreate({ approved: null })

  expect(identityDeviceWithAuthRequestToJson(device, pendingAuthRequest)).toEqual({
    id: "device-json",
    name: "Device JSON",
    type: 7,
    identifier: "device-json",
    creationDate: "2026-08-28T00:00:00.000Z",
    devicePendingAuthRequest: {
      id: "auth-request-json",
      creationDate: "2026-08-28T00:00:00.000Z",
    },
    isTrusted: false,
    encryptedPublicKey: null,
    encryptedUserKey: null,
    object: "device",
  })
  expect(identityDeviceWithAuthRequestToJson(device, null).devicePendingAuthRequest).toBeNull()
})
