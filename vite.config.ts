import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/solid-start/plugin/vite"
import { solidAiSrcPlugin } from "ai-src/solid"
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"
import { seo } from "./src/lib/seo.js"
const buildDate = new Date().toISOString().slice(0, 10)
const prerenderPages = [
  { path: "/", prerender: { enabled: true }, sitemap: { changefreq: "weekly", priority: 1 } },
  { path: "/impressum", prerender: { enabled: true }, sitemap: { changefreq: "yearly", priority: 0.2 } },
  { path: "/agb", prerender: { enabled: true }, sitemap: { changefreq: "yearly", priority: 0.2 } },
] satisfies Array<{
  path: string
  prerender: { enabled: boolean }
  sitemap: { changefreq: "weekly" | "yearly"; priority: number; lastmod?: string } | { exclude: true }
}>

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
      router: {
        quoteStyle: "double",
        semicolons: false,
        routesDirectory: "routes",
      },
      prerender: {
        enabled: true,
        crawlLinks: false,
        autoStaticPathsDiscovery: false,
        autoSubfolderIndex: false,
      },
      pages: prerenderPages,
      sitemap: {
        enabled: true,
        host: "https://onewarden.com",
      },
    }),
    solidAiSrcPlugin(),
    solid({ ssr: true }),
  ],
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
  },
})
