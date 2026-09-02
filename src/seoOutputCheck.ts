import { readFile } from "node:fs/promises"
import { join } from "node:path"

const distClient = join(process.cwd(), "dist", "client")
const siteUrl = "https://onewarden.com"
const requiredFiles = [
  "index.html",
  "404.html",
  "sitemap.xml",
  "robots.txt",
  "_headers",
  "favicon.svg",
  "favicon.ico",
  "site.webmanifest",
] as const
const failures: string[] = []

async function outputRead(path: string): Promise<string | undefined> {
  try {
    return await readFile(join(distClient, path), "utf8")
  } catch {
    failures.push("missing dist/client/" + path)
    return undefined
  }
}

for (const path of requiredFiles) await outputRead(path)
const index = await outputRead("index.html")
if (index !== undefined) {
  const checks = [
    ["html lang", /<html\b[^>]*\blang=["'][^"']+["']/i],
    ["title", /<title\b[^>]*>[^<]+<\/title>/i],
    ["description", /<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["'][^"']+["']/i],
    ["og title", /<meta\b[^>]*\bproperty=["']og:title["'][^>]*\bcontent=["'][^"']+["']/i],
    ["og image", /<meta\b[^>]*\bproperty=["']og:image["'][^>]*\bcontent=["']https?:\/\//i],
    ["twitter card", /<meta\b[^>]*\bname=["']twitter:card["'][^>]*\bcontent=["']summary_large_image["']/i],
    ["json-ld", /<script\b[^>]*\btype=["']application\/ld\+json["']/i],
    ["speculation rules", /<script\b[^>]*\btype=["']speculationrules["']/i],
  ] as const
  for (const [label, pattern] of checks) if (!pattern.test(index)) failures.push("index.html: missing " + label)
}

const sitemap = await outputRead("sitemap.xml")
if (sitemap !== undefined && !sitemap.includes(siteUrl)) failures.push("sitemap.xml: missing absolute site URL")
const notFound = await outputRead("404.html")
if (notFound !== undefined && !notFound.includes("Page not found")) failures.push("404.html: missing not-found content")
const robots = await outputRead("robots.txt")
if (robots !== undefined && !robots.includes("Sitemap: " + siteUrl + "/sitemap.xml"))
  failures.push("robots.txt: missing sitemap")
const headers = await outputRead("_headers")
if (headers !== undefined && (!headers.includes("/assets/*") || !headers.includes("immutable")))
  failures.push("_headers: missing immutable asset cache")

if (failures.length > 0) {
  console.error("Public SEO output verification failed:\n" + failures.map((failure) => "- " + failure).join("\n"))
  process.exitCode = 1
} else {
  console.log("Verified Cloudflare Pages public output and baseline SEO.")
}
