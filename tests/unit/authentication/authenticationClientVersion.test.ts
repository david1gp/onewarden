import { expect, test } from "bun:test"
import { authenticationClientVersionCompare } from "../../../src/server/contexts/authentication/authenticationClientVersionCompare.js"
import { authenticationClientVersionOptionalParse } from "../../../src/server/contexts/authentication/authenticationClientVersionOptionalParse.js"
import { authenticationClientVersionParse } from "../../../src/server/contexts/authentication/authenticationClientVersionParse.js"
import type { AuthenticationClientVersion } from "../../../src/server/contexts/authentication/authenticationClientVersionSchema.js"

function versionCreate(value: string): AuthenticationClientVersion {
  const result = authenticationClientVersionParse(value)
  if (!result.success) throw new Error(result.errorMessage)
  return result.data
}

test("authenticationClientVersionParse preserves SemVer components and raw header", () => {
  expect(authenticationClientVersionParse("1.2.3-alpha.1+linux.7")).toEqual({
    success: true,
    data: {
      build: ["linux", "7"],
      major: 1,
      minor: 2,
      patch: 3,
      preRelease: ["alpha", "1"],
      raw: "1.2.3-alpha.1+linux.7",
    },
  })
})

test("authenticationClientVersionParse rejects missing, malformed, and non-SemVer headers", () => {
  for (const value of [undefined, "", "1", "1.2", "01.2.3", "1.02.3", "1.2.03", "1.2.3-01", "1.2.3-"]) {
    expect(authenticationClientVersionParse(value)).toMatchObject({
      success: false,
      op: "authenticationClientVersionParse",
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }
  expect(authenticationClientVersionParse(undefined)).toMatchObject({
    errorMessage: "No Bitwarden-Client-Version header provided",
  })
  expect(authenticationClientVersionParse("not-semver")).toMatchObject({
    errorMessage: "Invalid Bitwarden-Client-Version header provided",
  })
})

test("authenticationClientVersionOptionalParse distinguishes absent from invalid headers", () => {
  expect(authenticationClientVersionOptionalParse(undefined)).toEqual({ success: true, data: null })
  expect(authenticationClientVersionOptionalParse("2024.12.0")).toMatchObject({
    success: true,
    data: { major: 2024, minor: 12, patch: 0 },
  })
  expect(authenticationClientVersionOptionalParse("2024.12")).toMatchObject({
    success: false,
    errorMessage: "Invalid Bitwarden-Client-Version header provided",
  })
})

test("authenticationClientVersionCompare follows SemVer precedence including arbitrary-size numeric identifiers", () => {
  const ordered = [
    "1.0.0-alpha",
    "1.0.0-alpha.1",
    "1.0.0-alpha.beta",
    "1.0.0-beta",
    "1.0.0-beta.2",
    "1.0.0-beta.11",
    "1.0.0-rc.1",
    "1.0.0",
  ].map(versionCreate)
  for (let index = 1; index < ordered.length; index += 1) {
    expect(authenticationClientVersionCompare(ordered[index - 1]!, ordered[index]!)).toBe(-1)
  }
  expect(authenticationClientVersionCompare(versionCreate("2024.12.0+one"), versionCreate("2024.12.0+two"))).toBe(0)
  expect(
    authenticationClientVersionCompare(
      versionCreate("1.0.0-999999999999999999999999999999999999"),
      versionCreate("1.0.0-1000000000000000000000000000000000000"),
    ),
  ).toBe(-1)
})
