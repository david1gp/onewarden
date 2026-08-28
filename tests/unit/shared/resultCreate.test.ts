import { expect, test } from "bun:test"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"

test("resultCreate preserves the installed Result success shape", () => {
  expect(resultCreate({ value: 42 })).toEqual({ success: true, data: { value: 42 } })
})

test("resultErrorCreate adds catalog metadata without throwing", () => {
  expect(
    resultErrorCreate("vaultRead", "Vault was not found.", {
      code: "vault.not-found",
      statusCode: 404,
    }),
  ).toEqual({
    success: false,
    op: "vaultRead",
    code: "vault.not-found",
    errorMessage: "Vault was not found.",
    statusCode: 404,
  })
})
