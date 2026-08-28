import * as v from "valibot"

const iconConfigBooleanSchema = v.pipe(
  v.string(),
  v.trim(),
  v.picklist(["false", "true"]),
  v.transform((value) => value === "true"),
)

const iconConfigNonNegativeIntegerSchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(/^\d+$/, "The value must be a non-negative integer."),
  v.transform(Number),
  v.integer(),
  v.minValue(0),
)

const iconConfigServiceSchema = v.pipe(
  v.string(),
  v.trim(),
  v.check((value) => {
    if (["internal", "bitwarden", "duckduckgo", "google"].includes(value)) return true
    if (!/^https?:\/\//i.test(value) || [...value.matchAll(/\{\}/g)].length !== 1) return false
    try {
      new URL(value.replace("{}", "example.com"))
      return true
    } catch {
      return false
    }
  }, "ICON_SERVICE must be a known service or an HTTP(S) URL with exactly one {} placeholder."),
)

const iconConfigFolderSchema = v.pipe(v.string(), v.trim(), v.minLength(1))

const iconConfigRegexSchema = v.pipe(
  v.string(),
  v.trim(),
  v.check((value) => {
    try {
      new RegExp(value)
      return true
    } catch {
      return false
    }
  }, "HTTP_REQUEST_BLOCK_REGEX must be a valid regular expression."),
)

export const iconConfigSchema = v.object({
  DISABLE_ICON_DOWNLOAD: v.optional(iconConfigBooleanSchema, "false"),
  HTTP_REQUEST_BLOCK_NON_GLOBAL_IPS: v.optional(iconConfigBooleanSchema, "true"),
  HTTP_REQUEST_BLOCK_REGEX: v.optional(iconConfigRegexSchema),
  ICON_CACHE_FOLDER: v.optional(iconConfigFolderSchema, "data/icon_cache"),
  ICON_CACHE_NEGTTL: v.optional(iconConfigNonNegativeIntegerSchema, "259200"),
  ICON_CACHE_TTL: v.optional(iconConfigNonNegativeIntegerSchema, "2592000"),
  ICON_DOWNLOAD_TIMEOUT: v.optional(iconConfigNonNegativeIntegerSchema, "10"),
  ICON_REDIRECT_CODE: v.pipe(
    v.optional(iconConfigNonNegativeIntegerSchema, "302"),
    v.check((value) => [301, 302, 307, 308].includes(value), "ICON_REDIRECT_CODE must be 301, 302, 307, or 308."),
  ),
  ICON_SERVICE: v.optional(iconConfigServiceSchema, "internal"),
})

export type IconConfig = v.InferOutput<typeof iconConfigSchema>
