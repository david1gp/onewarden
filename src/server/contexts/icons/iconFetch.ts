import { isIP } from "node:net"
import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { IconConfig } from "./iconConfigSchema.js"
import type { IconHttpAdapter } from "./iconHttpAdapter.js"
import { iconHostBlocked } from "./iconHostBlocked.js"
import { iconHostValidate } from "./iconHostValidate.js"

type IconFetchOptions = {
  config: IconConfig
  http: IconHttpAdapter
}

type IconFetchedResponse = {
  response: Response
  url: string
}

export async function iconFetch(
  url: string,
  options: IconFetchOptions,
  referer = "",
): Promise<Result<IconFetchedResponse>> {
  let currentUrl = url
  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    const validationResult = await iconFetchUrlValidate(currentUrl, options)
    if (!validationResult.success) return validationResult

    let response: Response
    try {
      const signal =
        options.config.ICON_DOWNLOAD_TIMEOUT > 0
          ? AbortSignal.timeout(options.config.ICON_DOWNLOAD_TIMEOUT * 1_000)
          : undefined
      response = await options.http.fetch(currentUrl, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          ...(referer.length === 0 ? {} : { Referer: referer }),
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36",
        },
        redirect: "manual",
        ...(signal === undefined ? {} : { signal }),
      })
    } catch {
      return resultErrorCreate("iconFetch", "The icon request failed.", { code: "icons.unavailable" })
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (location === null)
        return resultErrorCreate("iconFetch", "The icon redirect was invalid.", { code: "icons.unavailable" })
      if (redirectCount === 5)
        return resultErrorCreate("iconFetch", "The icon redirect chain is too long.", { code: "icons.unavailable" })
      try {
        currentUrl = new URL(location, currentUrl).toString()
      } catch {
        return resultErrorCreate("iconFetch", "The icon redirect was invalid.", { code: "icons.unavailable" })
      }
      continue
    }

    if (!response.ok)
      return resultErrorCreate("iconFetch", "The icon request returned an error.", { code: "icons.unavailable" })
    return resultCreate({ response, url: currentUrl })
  }

  return resultErrorCreate("iconFetch", "The icon redirect chain is too long.", { code: "icons.unavailable" })
}

async function iconFetchUrlValidate(url: string, options: IconFetchOptions): Promise<Result<string>> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return resultErrorCreate("iconFetch", "The icon URL is invalid.", { code: "icons.unavailable" })
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    return resultErrorCreate("iconFetch", "The icon URL scheme is invalid.", { code: "icons.blocked" })
  if (parsed.username.length > 0 || parsed.password.length > 0)
    return resultErrorCreate("iconFetch", "The icon URL is invalid.", { code: "icons.blocked" })

  const host =
    parsed.hostname.startsWith("[") && parsed.hostname.endsWith("]") ? parsed.hostname.slice(1, -1) : parsed.hostname
  const hostResult = iconHostValidate(host)
  if (!hostResult.success) return resultErrorCreate("iconFetch", "The icon host is invalid.", { code: "icons.blocked" })
  if (iconHostBlocked(hostResult.data, options.config))
    return resultErrorCreate("iconFetch", "The icon host is blocked.", { code: "icons.blocked" })

  if (options.http.resolveHost !== undefined && isIP(hostResult.data) === 0) {
    try {
      const addresses = await options.http.resolveHost(hostResult.data)
      if (addresses.some((address) => iconHostBlocked(address, options.config)))
        return resultErrorCreate("iconFetch", "The icon host is blocked.", { code: "icons.blocked" })
    } catch {
      // A DNS failure is an ordinary download failure. The fetch adapter reports it below.
    }
  }
  return resultCreate(url)
}
