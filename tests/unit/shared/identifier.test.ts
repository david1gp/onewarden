import { expect, test } from "bun:test"
import { identifierCreate } from "../../../src/shared/identifier/identifierCreate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"

test("identifierCreate returns UUIDs", () => {
  expect(identifierCreate().uuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})

test("identifierTestCreate returns deterministic values", () => {
  const identifier = identifierTestCreate(["request-one", "request-two"])

  expect(identifier.uuid()).toBe("request-one")
  expect(identifier.uuid()).toBe("request-two")
  expect(identifier.uuid()).toBe("request-two")
})
