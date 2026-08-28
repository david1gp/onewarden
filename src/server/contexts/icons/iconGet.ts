import { isIP } from "node:net"
import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { iconContentTypeResolve } from "./iconContentTypeResolve.js"
import type { IconRouteOptions } from "./iconRouteOptions.js"
import { iconFetch } from "./iconFetch.js"
import { iconHostValidate } from "./iconHostValidate.js"

type IconResource = {
  bytes: Uint8Array
  subtype: string
}

type IconCandidate = {
  href: string
  order: number
  priority: number
}

type IconPage = {
  candidates: IconCandidate[]
  referer: string
}

type IconPageAttempt = { kind: "blocked" } | { kind: "failed" } | { html: string; kind: "success"; referer: string }

type IconBytesResult = { bytes: Uint8Array; success: true } | { success: false }

export async function iconGet(domain: string, options: IconRouteOptions): Promise<Result<IconResource>> {
  const hostResult = iconHostValidate(domain)
  if (!hostResult.success) return resultErrorCreate("iconGet", "The icon host is invalid.", { code: "icons.blocked" })
  const pageResult = await iconPageResolve(hostResult.data, options)
  if (pageResult.kind === "blocked")
    return resultErrorCreate("iconGet", "The icon host is blocked.", { code: "icons.blocked" })

  const page: IconPage =
    pageResult.kind === "success"
      ? iconPageCreate(pageResult.html, pageResult.referer)
      : iconPageFallbackCreate(hostResult.data)
  const candidates = page.candidates
    .slice()
    .sort((left, right) => left.priority - right.priority || left.order - right.order)

  let lastFailure = "The icon could not be downloaded."
  for (const candidate of candidates.slice(0, 5)) {
    const resource = await iconCandidateGet(candidate, page.referer, options)
    if (resource.kind === "blocked")
      return resultErrorCreate("iconGet", "The icon host is blocked.", { code: "icons.blocked" })
    if (resource.kind === "failed") {
      lastFailure = resource.message
      continue
    }
    return resultCreate(resource.resource)
  }
  return resultErrorCreate("iconGet", lastFailure, { code: "icons.unavailable" })
}

async function iconPageResolve(domain: string, options: IconRouteOptions): Promise<IconPageAttempt> {
  const direct = await iconPageTryDomain(domain, options)
  if (direct.kind !== "failed") return direct
  if (isIP(domain) === 0 && domain.split(".").length > 2) {
    const labels = domain.split(".")
    const baseDomain = `${labels.at(-2)}.${labels.at(-1)}`
    const baseResult = iconHostValidate(baseDomain)
    if (baseResult.success) {
      const base = await iconPageTryDomain(baseResult.data, options)
      if (base.kind !== "failed") return base
    }
  } else if (isIP(domain) === 0 && domain.split(".").length < 3) {
    const wwwResult = iconHostValidate(`www.${domain}`)
    if (wwwResult.success) {
      const www = await iconPageTryDomain(wwwResult.data, options)
      if (www.kind !== "failed") return www
    }
  }
  return direct
}

async function iconPageTryDomain(domain: string, options: IconRouteOptions): Promise<IconPageAttempt> {
  for (const scheme of ["https", "http"]) {
    const result = await iconFetch(`${scheme}://${domain}`, options)
    if (!result.success) {
      if (result.code === "icons.blocked") return { kind: "blocked" }
      continue
    }
    const body = await iconResponseRead(result.data.response, 384 * 1024, true)
    if (!body.success) return { kind: "failed" }
    return {
      html: new TextDecoder().decode(body.bytes),
      kind: "success",
      referer: result.data.url,
    }
  }
  return { kind: "failed" }
}

function iconPageCreate(html: string, referer: string): IconPage {
  const candidates: IconCandidate[] = [
    { href: new URL("/favicon.ico", referer).toString(), order: 0, priority: 35 },
    { href: new URL("/apple-touch-icon.png", referer).toString(), order: 1, priority: 40 },
  ]
  const headEnd = html.search(/<\/head\s*>/iu)
  const head = html.slice(0, headEnd === -1 ? html.length : headEnd)
  const tags = [...head.matchAll(/<(base|link)\b[^>]*>/giu)]
  let baseUrl = referer
  const links: Array<{ href: string; sizes: string }> = []
  for (const tagMatch of tags) {
    const tagName = tagMatch[1]?.toLowerCase()
    const attributes = iconHtmlAttributes(tagMatch[0] ?? "")
    if (tagName === "base") {
      const href = attributes.get("href")
      if (href !== undefined) {
        try {
          baseUrl = new URL(iconHtmlEntityDecode(href), baseUrl).toString()
        } catch {
          // Keep the previous base when a page publishes an invalid base URL.
        }
      }
      continue
    }
    const rel = attributes.get("rel")?.toLowerCase() ?? ""
    const href = attributes.get("href")
    if (href !== undefined && rel.includes("icon") && !rel.includes("mask-icon"))
      links.push({ href: iconHtmlEntityDecode(href), sizes: attributes.get("sizes") ?? "" })
  }
  let order = candidates.length
  for (const link of links) {
    const href = link.href.toLowerCase().startsWith("data:image") ? link.href : iconUrlResolve(link.href, baseUrl)
    if (href === undefined) continue
    candidates.push({ href, order, priority: iconPriority(href, link.sizes) })
    order += 1
  }
  return { candidates, referer }
}

function iconPageFallbackCreate(domain: string): IconPage {
  const candidates: IconCandidate[] = []
  let order = 0
  for (const scheme of ["https", "http"]) {
    for (const path of ["/favicon.ico", "/apple-touch-icon.png"]) {
      candidates.push({ href: `${scheme}://${domain}${path}`, order, priority: path.endsWith(".ico") ? 35 : 40 })
      order += 1
    }
  }
  return { candidates, referer: "" }
}

async function iconCandidateGet(
  candidate: IconCandidate,
  referer: string,
  options: IconRouteOptions,
): Promise<{ kind: "blocked" } | { kind: "failed"; message: string } | { kind: "success"; resource: IconResource }> {
  let bytes: Uint8Array
  if (candidate.href.toLowerCase().startsWith("data:image")) {
    const decoded = iconDataUriDecode(candidate.href)
    if (decoded === undefined || decoded.bytes.length < 67)
      return { kind: "failed", message: "The data icon is invalid." }
    bytes = decoded.bytes
  } else {
    const response = await iconFetch(candidate.href, options, referer)
    if (!response.success) {
      if (response.code === "icons.blocked") return { kind: "blocked" }
      return { kind: "failed", message: response.errorMessage }
    }
    const body = await iconResponseRead(response.data.response, 5 * 1024 * 1024, false)
    if (!body.success) return { kind: "failed", message: "The icon response is too large or unreadable." }
    bytes = body.bytes
  }

  const subtype = iconContentTypeResolve(bytes)
  if (subtype === undefined) return { kind: "failed", message: "The icon response is not an image." }
  if (subtype === "svg+xml" && !iconSvgIsSafe(bytes)) return { kind: "failed", message: "The SVG icon is unsafe." }
  return { kind: "success", resource: { bytes, subtype } }
}

function iconHtmlAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>()
  const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gu
  for (const match of tag.matchAll(attributePattern)) {
    const name = match[1]?.toLowerCase()
    if (name === undefined || name === "base" || name === "link") continue
    const value = match[2] ?? match[3] ?? match[4]
    if (value !== undefined && !attributes.has(name)) attributes.set(name, value)
  }
  return attributes
}

function iconHtmlEntityDecode(value: string): string {
  return value
    .replaceAll(/&(?:amp|#38);/giu, "&")
    .replaceAll(/&quot;/giu, '"')
    .replaceAll(/&#39;/gu, "'")
}

function iconUrlResolve(href: string, baseUrl: string): string | undefined {
  try {
    const url = new URL(href, baseUrl)
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

function iconPriority(href: string, sizes: string): number {
  const size = /(?:^|\D)(\d+)\D+(\d+)(?:\D|$)/u.exec(sizes)
  if (size !== null) {
    const width = Number(size[1])
    const height = Number(size[2])
    if (width === height) {
      if (width === 32) return 1
      if (width === 64) return 2
      if (width >= 24 && width <= 192) return 3
      if (width === 16) return 4
      return 5
    }
    return 200
  }
  const extension = href
    .split("?")[0]
    ?.split("#")[0]
    ?.match(/\.([a-z0-9]+)$/iu)?.[1]
    ?.toLowerCase()
  if (extension === "png") return 10
  if (extension === "jpg" || extension === "jpeg") return 20
  return 30
}

function iconDataUriDecode(value: string): { bytes: Uint8Array; subtype: string } | undefined {
  const comma = value.indexOf(",")
  if (comma < 0) return undefined
  const metadata = value.slice(5, comma)
  if (!metadata.toLowerCase().startsWith("image/")) return undefined
  const encoded = value.slice(comma + 1)
  try {
    if (metadata.toLowerCase().includes(";base64")) {
      const binary = atob(encoded)
      return {
        bytes: Uint8Array.from(binary, (character) => character.charCodeAt(0)),
        subtype: metadata.slice(6).split(";")[0] ?? "",
      }
    }
    return { bytes: new TextEncoder().encode(decodeURIComponent(encoded)), subtype: metadata.slice(6) }
  } catch {
    return undefined
  }
}

function iconSvgIsSafe(bytes: Uint8Array): boolean {
  const source = new TextDecoder().decode(bytes)
  return (
    !/<\/?(?:script|iframe|object|embed|foreignObject)\b/iu.test(source) &&
    !/\son[a-z]+\s*=/iu.test(source) &&
    !/javascript:/iu.test(source) &&
    !/(?:\b(?:href|xlink:href|src)\s*=\s*["']?)(?:https?:|\/\/|data:text\/html)/iu.test(source)
  )
}

async function iconResponseRead(response: Response, maxSize: number, truncate: boolean): Promise<IconBytesResult> {
  if (response.body === null) return { bytes: new Uint8Array(), success: true }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      const chunk = next.value
      if (size + chunk.length > maxSize) {
        if (!truncate) {
          await reader.cancel()
          return { success: false }
        }
        const remaining = maxSize - size
        if (remaining > 0) chunks.push(chunk.slice(0, remaining))
        await reader.cancel()
        size = maxSize
        break
      }
      chunks.push(chunk)
      size += chunk.length
    }
  } catch {
    return { success: false }
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return { bytes, success: true }
}
