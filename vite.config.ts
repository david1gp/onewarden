import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"

export default defineConfig({
  root: "src/web",
  plugins: [solid(), tailwindcss()],
  server: {
    allowedHosts: ["onewarden.david-siewert.com"],
  },
  build: {
    outDir: "../../build/web",
    emptyOutDir: true,
  },
})
