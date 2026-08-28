import type { IconConfig } from "./iconConfigSchema.js"

export function iconConfigCreate(overrides?: Partial<IconConfig>): IconConfig {
  return {
    DISABLE_ICON_DOWNLOAD: overrides?.DISABLE_ICON_DOWNLOAD ?? false,
    HTTP_REQUEST_BLOCK_NON_GLOBAL_IPS: overrides?.HTTP_REQUEST_BLOCK_NON_GLOBAL_IPS ?? true,
    HTTP_REQUEST_BLOCK_REGEX: overrides?.HTTP_REQUEST_BLOCK_REGEX,
    ICON_CACHE_FOLDER: overrides?.ICON_CACHE_FOLDER ?? "data/icon_cache",
    ICON_CACHE_NEGTTL: overrides?.ICON_CACHE_NEGTTL ?? 259_200,
    ICON_CACHE_TTL: overrides?.ICON_CACHE_TTL ?? 2_592_000,
    ICON_DOWNLOAD_TIMEOUT: overrides?.ICON_DOWNLOAD_TIMEOUT ?? 10,
    ICON_REDIRECT_CODE: overrides?.ICON_REDIRECT_CODE ?? 302,
    ICON_SERVICE: overrides?.ICON_SERVICE ?? "internal",
  }
}
