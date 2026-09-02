import type { ExtensionEnvironmentSource } from "./extensionEnvironmentSourceSchema.js"

/** First-run environment source for the self-hosted OneWarden server. */
export const extensionEnvironmentDefaultSource = {
  base: "https://onewarden.contentoren.de",
} as const satisfies ExtensionEnvironmentSource
