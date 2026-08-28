import type { Clock } from "../clock/clock.js"
import { clockCreate } from "../clock/clockCreate.js"
import type { Logger } from "./logger.js"

const loggerLevels = ["debug", "info", "warn", "error"] as const
type LoggerLevel = (typeof loggerLevels)[number]
type LoggerEntry = {
  timestamp: string
  level: LoggerLevel
  message: string
  fields?: Readonly<Record<string, unknown>>
}
type LoggerSink = (entry: LoggerEntry) => void

const redactedValue = "[REDACTED]"
const sensitiveKeyParts = [
  "accesskey",
  "accesstoken",
  "apikey",
  "authorization",
  "cookie",
  "encryptionkey",
  "masterpassword",
  "password",
  "privatekey",
  "recoverycode",
  "refreshtoken",
  "secret",
  "session",
  "token",
]

function loggerKeyNormalize(key: string): string {
  return key.toLowerCase().replaceAll(/[^a-z0-9]/g, "")
}

function loggerKeyIsSensitive(key: string): boolean {
  const normalizedKey = loggerKeyNormalize(key)
  return sensitiveKeyParts.some((part) => normalizedKey.includes(part))
}

function loggerValueRedact(value: unknown, key: string, seen: WeakSet<object>): unknown {
  if (loggerKeyIsSensitive(key)) return redactedValue
  if (value === null || typeof value !== "object") return value
  if (value instanceof Error) return { name: value.name, message: value.message }
  if (seen.has(value)) return "[CIRCULAR]"
  seen.add(value)
  if (Array.isArray(value)) {
    const result = value.map((item) => loggerValueRedact(item, key, seen))
    seen.delete(value)
    return result
  }

  const result: Record<string, unknown> = {}
  for (const [childKey, childValue] of Object.entries(value)) {
    result[childKey] = loggerValueRedact(childValue, childKey, seen)
  }
  seen.delete(value)
  return result
}

function loggerFieldsRedact(
  fields: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> | undefined {
  if (fields === undefined) return undefined
  return loggerValueRedact(fields, "", new WeakSet()) as Readonly<Record<string, unknown>>
}

export function loggerCreate(options?: { clock?: Clock; level?: LoggerLevel; sink?: LoggerSink }): Logger {
  const clock = options?.clock ?? clockCreate()
  const minimumLevel = options?.level ?? "info"
  const sink =
    options?.sink ??
    ((entry: LoggerEntry) => {
      const line = JSON.stringify(entry)
      if (entry.level === "error") {
        console.error(line)
        return
      }
      console.log(line)
    })
  const minimumLevelIndex = loggerLevels.indexOf(minimumLevel)

  const write = (level: LoggerLevel, message: string, fields?: Readonly<Record<string, unknown>>): void => {
    if (loggerLevels.indexOf(level) < minimumLevelIndex) return
    const redactedFields = loggerFieldsRedact(fields)
    const entry: LoggerEntry = {
      timestamp: clock.now().toISOString(),
      level,
      message,
      ...(redactedFields === undefined ? {} : { fields: redactedFields }),
    }
    sink(entry)
  }

  return {
    debug: (message, fields) => write("debug", message, fields),
    info: (message, fields) => write("info", message, fields),
    warn: (message, fields) => write("warn", message, fields),
    error: (message, fields) => write("error", message, fields),
  }
}
