import { crx } from "@crxjs/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"
import { extensionManifest } from "./extensionManifest.js"

export default defineConfig({
  root: import.meta.dirname,
  plugins: [solid(), tailwindcss(), crx({ manifest: extensionManifest })],
  build: {
    outDir: "../../build/extension",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        fullwindow: "fullwindow/index.html",
        passkeyConsent: "passkey-consent/index.html",
      },
    },
  },
})
