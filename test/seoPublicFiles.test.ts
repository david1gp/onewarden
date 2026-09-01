import { describe, expect, test } from "bun:test"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

const publicDirectory = join(process.cwd(), "public")

describe("public web baseline", () => {
  test("contains the Cloudflare and SEO files", async () => {
    const [robots, headers, notFound, manifest, favicon, logo] = await Promise.all([
      readFile(join(publicDirectory, "robots.txt"), "utf8"),
      readFile(join(publicDirectory, "_headers"), "utf8"),
      readFile(join(publicDirectory, "404.html"), "utf8"),
      readFile(join(publicDirectory, "site.webmanifest"), "utf8"),
      readFile(join(publicDirectory, "favicon.ico")),
      readFile(join(publicDirectory, "logo.svg"), "utf8"),
    ])
    expect(robots).toContain("User-agent: *")
    expect(robots).toContain("Sitemap: https://onewarden.com/sitemap.xml")
    expect(headers).toContain("/assets/*")
    expect(headers).toContain("immutable")
    expect(notFound).toContain("Page not found")
    expect(JSON.parse(manifest)).toMatchObject({ name: "onewarden-site", start_url: "/" })
    expect(favicon.length).toBeGreaterThan(0)
    expect(logo).toContain("<svg")
  })
})
