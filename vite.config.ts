import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"

const projectRoot = import.meta.dirname
const solidUiRoot = resolve(projectRoot, "ui")
const webPort = 3041

export default defineConfig({
  root: projectRoot,
  build: { emptyOutDir: true, outDir: resolve(projectRoot, "dist/web") },
  plugins: [solid(), tailwindcss()],
  resolve: { alias: [{ find: "#ui", replacement: solidUiRoot }] },
  preview: { port: webPort, strictPort: true },
  publicDir: resolve(projectRoot, "public"),
  server: { allowedHosts: ["onewarden.david-siewert.com"], port: webPort, strictPort: true },
})
