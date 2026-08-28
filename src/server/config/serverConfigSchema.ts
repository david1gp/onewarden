import * as v from "valibot"

const serverConfigHostSchema = v.pipe(v.string(), v.trim(), v.minLength(1))
const serverConfigPortSchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(/^\d+$/, "PORT must be an integer from 1 to 65535"),
  v.transform(Number),
  v.integer(),
  v.minValue(1),
  v.maxValue(65535),
)
const serverConfigDatabasePathSchema = v.pipe(v.string(), v.trim(), v.minLength(1))
const serverConfigLogLevelSchema = v.picklist(["debug", "info", "warn", "error"])
const serverConfigProxySchema = v.pipe(
  v.string(),
  v.trim(),
  v.picklist(["false", "true"]),
  v.transform((value) => value === "true"),
)
const serverConfigPublicOriginSchema = v.pipe(v.string(), v.trim(), v.url())

export const serverConfigSchema = v.object({
  HOST: v.optional(serverConfigHostSchema, "127.0.0.1"),
  PORT: v.optional(serverConfigPortSchema, "3000"),
  DATABASE_PATH: v.optional(serverConfigDatabasePathSchema, "./data/onewarden.sqlite3"),
  LOG_LEVEL: v.optional(serverConfigLogLevelSchema, "info"),
  PROXY: v.optional(serverConfigProxySchema, "false"),
  PUBLIC_ORIGIN: v.optional(serverConfigPublicOriginSchema),
})

export type ServerConfig = v.InferOutput<typeof serverConfigSchema>
