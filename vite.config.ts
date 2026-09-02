import tailwindcss from "@tailwindcss/vite"
import { solidAiSrcPlugin } from "ai-src/solid"
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"

export default defineConfig({
  plugins: [tailwindcss(), solidAiSrcPlugin(), solid()],
  build: {
    outDir: "dist/client",
    assetsDir: "assets",
    emptyOutDir: true,
  },
})
