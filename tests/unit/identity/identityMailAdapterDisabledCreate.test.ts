import { expect, test } from "bun:test"
import { identityMailAdapterDisabledCreate } from "../../../src/server/contexts/identity/identityMailAdapterDisabledCreate.js"

test("disabled production mail adapter does not retain message content or tokens", async () => {
  const mail = identityMailAdapterDisabledCreate()
  const token = "production-secret-token"

  const result = await mail.sendRegisterVerifyEmail("recipient@example.com", token)

  expect("messages" in mail).toBe(false)
  expect(result).toMatchObject({
    success: false,
    errorMessage: "Mail delivery is disabled.",
    op: "identityMailAdapterDisabledCreate",
  })
  expect(JSON.stringify(result)).not.toContain(token)
})
