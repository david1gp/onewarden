import { expect, test } from "bun:test"
import { apiErrorCreate } from "../../../src/shared/api/apiErrorCreate.js"
import { apiErrorResponseCreate } from "../../../src/shared/api/apiErrorResponseCreate.js"

test("apiErrorCreate maps a catalog entry to a Bitwarden error response", async () => {
  const error = apiErrorCreate("vaultRead", "platform.not-found", "Vault was not found.")
  const response = apiErrorResponseCreate(error)

  expect(response.status).toBe(404)
  expect(await response.json()).toEqual({
    message: "Vault was not found.",
    validationErrors: { "": ["Vault was not found."] },
    errorModel: { message: "Vault was not found.", object: "error" },
    error: "",
    error_description: "",
    exceptionMessage: null,
    exceptionStackTrace: null,
    innerExceptionMessage: null,
    object: "error",
  })
})

test("apiErrorCreate maps unknown codes to a generic internal error", async () => {
  const response = apiErrorResponseCreate(apiErrorCreate("vaultRead", "vault.secret", "do not expose"))

  expect(response.status).toBe(500)
  expect(await response.json()).toMatchObject({
    message: "Internal server error.",
    errorModel: { message: "Internal server error.", object: "error" },
  })
})
