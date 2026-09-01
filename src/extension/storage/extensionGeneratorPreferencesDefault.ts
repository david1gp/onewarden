import type { ExtensionGeneratorPreferences } from "./extensionGeneratorPreferencesSchema.js"

export const extensionGeneratorPreferencesDefault: ExtensionGeneratorPreferences = {
  mode: "passphrase",
  password: {
    length: 20,
    characterPolicy: {
      lowercase: true,
      uppercase: true,
      numbers: true,
      symbols: true,
    },
  },
  passphrase: {
    numWords: 3,
    wordSeparator: "-",
    includeNumber: true,
  },
}
