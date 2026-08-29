import { expect, test } from "bun:test"
import { vaultUrlStateParse } from "../../../src/web/vault/model/vaultUrlStateParse.js"

test("vaultUrlStateParse extracts valid filter params from search query string", () => {
  const query = "?vault=Work&category=login&folder=Development&collection=col-1&q=github&item=item-123"
  const parsed = vaultUrlStateParse(query)

  expect(parsed.vault).toBe("Work")
  expect(parsed.category).toBe("login")
  expect(parsed.folder).toBe("Development")
  expect(parsed.collection).toBe("col-1")
  expect(parsed.search).toBe("github")
  expect(parsed.selectedItemId).toBe("item-123")
})

test("vaultUrlStateParse ignores invalid category and uses fallback", () => {
  const query = "?category=invalidCategory"
  const parsed = vaultUrlStateParse(query)

  expect(parsed.category).toBeUndefined()
})
