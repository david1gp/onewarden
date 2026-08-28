import type { NotificationConnection } from "./notificationConnection.js"
import { notificationAnonymousConnectionLimit } from "./notificationAnonymousConnectionLimit.js"

export type NotificationAnonymousConnectionRegistry = {
  add: (token: string, connectionId: string, connection: NotificationConnection) => () => void
  count: (token?: string) => number
  countByIp: (ip: string) => number
  release: (ip: string) => void
  reserve: (ip: string) => boolean
  send: (token: string, data: Uint8Array) => void
}

export function notificationAnonymousConnectionRegistryCreate(options?: {
  maxConnectionsPerIp?: number
}): NotificationAnonymousConnectionRegistry {
  const maxConnectionsPerIp = options?.maxConnectionsPerIp ?? notificationAnonymousConnectionLimit
  const connections = new Map<string, Map<string, NotificationConnection>>()
  const connectionsByIp = new Map<string, number>()

  const reserve = (ip: string): boolean => {
    const current = connectionsByIp.get(ip) ?? 0
    if (current >= maxConnectionsPerIp) return false
    connectionsByIp.set(ip, current + 1)
    return true
  }

  const release = (ip: string): void => {
    const current = connectionsByIp.get(ip)
    if (current === undefined) return
    if (current <= 1) {
      connectionsByIp.delete(ip)
      return
    }
    connectionsByIp.set(ip, current - 1)
  }

  const add = (token: string, connectionId: string, connection: NotificationConnection): (() => void) => {
    let entries = connections.get(token)
    if (entries === undefined) {
      entries = new Map()
      connections.set(token, entries)
    }
    entries.set(connectionId, connection)

    let removed = false
    return () => {
      if (removed) return
      removed = true
      const current = connections.get(token)
      if (current === undefined) return
      current.delete(connectionId)
      if (current.size === 0) connections.delete(token)
    }
  }

  const count = (token?: string): number => {
    if (token !== undefined) return connections.get(token)?.size ?? 0
    let total = 0
    for (const entries of connections.values()) total += entries.size
    return total
  }

  const countByIp = (ip: string): number => connectionsByIp.get(ip) ?? 0

  const send = (token: string, data: Uint8Array): void => {
    const entries = connections.get(token)
    if (entries === undefined) return
    for (const [connectionId, connection] of [...entries.entries()]) {
      let sent = false
      try {
        sent = connection.send(data)
      } catch {}
      if (!sent) {
        entries.delete(connectionId)
        if (entries.size === 0) connections.delete(token)
        try {
          connection.close()
        } catch {}
      }
    }
  }

  return { add, count, countByIp, release, reserve, send }
}
