import { expect, test } from "bun:test"
import { cipherItemFromWire } from "../../../src/web/ciphers/model/cipherItemFromWire.js"

test("cipherItemFromWire preserves denied cipher capabilities", () => {
  const item = cipherItemFromWire({
    id: "restricted-item",
    type: 1,
    name: "Restricted Login",
    favorite: false,
    fields: [],
    viewPassword: false,
    edit: false,
    permissions: { delete: false, restore: false },
    login: {
      username: "user@example.com",
      password: "secret",
    },
  })

  expect(item.viewPassword).toBe(false)
  expect(item.edit).toBe(false)
  expect(item.permissions).toEqual({ delete: false, restore: false })
})
