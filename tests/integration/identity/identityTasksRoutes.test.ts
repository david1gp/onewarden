import { expect, test } from "bun:test"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"

const expectedResponse = { data: [], object: "list" }

test("GET /api/tasks returns the empty task list without authentication", async () => {
  const app = serverAppCreate()

  const response = await app.request("https://vault.example/api/tasks")

  expect(response.status).toBe(200)
  expect(response.headers.get("content-type")).toBe("application/json")
  expect(await response.json()).toEqual(expectedResponse)
})

test("GET /api/tasks ignores authentication headers and query strings", async () => {
  const app = serverAppCreate()

  const response = await app.request("https://vault.example/api/tasks?ignored=true", {
    headers: {
      authorization: "Bearer malformed",
      "Bitwarden-Client-Version": "not-a-version",
    },
  })

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(expectedResponse)
})
