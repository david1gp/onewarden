import { expect, test } from "bun:test"
import { notificationAnonymousConnectionRegistryCreate } from "../../../src/server/contexts/notifications/notificationAnonymousConnectionRegistry.js"
import { notificationAnonymousConnectionLimit } from "../../../src/server/contexts/notifications/notificationAnonymousConnectionLimit.js"
import { notificationConnectionRegistryCreate } from "../../../src/server/contexts/notifications/notificationConnectionRegistry.js"

test("authenticated connections fan out to every open connection and clean up independently", () => {
  const registry = notificationConnectionRegistryCreate()
  const messages: number[] = []
  const first = registry.add("user-id", "first", { close: () => undefined, send: () => Boolean(messages.push(1)) })
  const second = registry.add("user-id", "second", { close: () => undefined, send: () => Boolean(messages.push(2)) })

  registry.send("user-id", new Uint8Array([1]))
  expect(messages).toEqual([1, 2])
  expect(registry.count("user-id")).toBe(2)
  first()
  second()
  expect(registry.count()).toBe(0)
})

test("anonymous connections are limited per IP and release their slots", () => {
  const registry = notificationAnonymousConnectionRegistryCreate()
  const removals: Array<() => void> = []
  for (let index = 0; index < notificationAnonymousConnectionLimit; index += 1) {
    expect(registry.reserve("192.0.2.1")).toBe(true)
    const remove = registry.add("auth-request", `connection-${index}`, { close: () => undefined, send: () => true })
    removals.push(() => {
      remove()
      registry.release("192.0.2.1")
    })
  }
  expect(registry.reserve("192.0.2.1")).toBe(false)
  removals[0]!()
  expect(registry.countByIp("192.0.2.1")).toBe(notificationAnonymousConnectionLimit - 1)
  expect(registry.reserve("192.0.2.1")).toBe(true)
  for (const remove of removals.slice(1)) remove()
  registry.release("192.0.2.1")
  expect(registry.countByIp("192.0.2.1")).toBe(0)
})

test("failed sends close and remove the connection", () => {
  const registry = notificationConnectionRegistryCreate()
  let closed = 0
  registry.add("user-id", "connection", {
    close: () => {
      closed += 1
    },
    send: () => false,
  })

  registry.send("user-id", new Uint8Array([1]))
  expect(closed).toBe(1)
  expect(registry.count()).toBe(0)
})
