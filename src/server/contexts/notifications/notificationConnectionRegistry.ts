import type { NotificationConnection } from "./notificationConnection.js"

export type NotificationConnectionRegistry = {
  add: (key: string, connectionId: string, connection: NotificationConnection) => () => void
  count: (key?: string) => number
  send: (key: string, data: Uint8Array) => void
}

export function notificationConnectionRegistryCreate(): NotificationConnectionRegistry {
  const connections = new Map<string, Map<string, NotificationConnection>>()

  const add = (key: string, connectionId: string, connection: NotificationConnection): (() => void) => {
    let entries = connections.get(key)
    if (entries === undefined) {
      entries = new Map()
      connections.set(key, entries)
    }
    entries.set(connectionId, connection)

    let removed = false
    return () => {
      if (removed) return
      removed = true
      const current = connections.get(key)
      if (current === undefined) return
      current.delete(connectionId)
      if (current.size === 0) connections.delete(key)
    }
  }

  const count = (key?: string): number => {
    if (key !== undefined) return connections.get(key)?.size ?? 0
    let total = 0
    for (const entries of connections.values()) total += entries.size
    return total
  }

  const send = (key: string, data: Uint8Array): void => {
    const entries = connections.get(key)
    if (entries === undefined) return
    for (const [connectionId, connection] of [...entries.entries()]) {
      let sent = false
      try {
        sent = connection.send(data)
      } catch {}
      if (!sent) {
        entries.delete(connectionId)
        if (entries.size === 0) connections.delete(key)
        try {
          connection.close()
        } catch {}
      }
    }
  }

  return { add, count, send }
}
