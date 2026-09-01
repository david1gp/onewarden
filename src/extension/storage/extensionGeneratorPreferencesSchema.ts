import * as v from "valibot"
import { extensionFullWindowGeneratorMode } from "../fullwindow/ExtensionFullWindowGeneratorMode.js"
import { extensionStorageSchemaVersion } from "./extensionStorageSchemaVersion.js"

const extensionGeneratorPreferencesCharacterPolicySchema = v.pipe(
  v.strictObject({
    lowercase: v.boolean(),
    uppercase: v.boolean(),
    numbers: v.boolean(),
    symbols: v.boolean(),
  }),
  v.check(
    (characterPolicy) => Object.values(characterPolicy).some(Boolean),
    "At least one password character policy must be enabled.",
  ),
)

const extensionGeneratorPreferencesDataSchema = v.strictObject({
  mode: v.picklist([extensionFullWindowGeneratorMode.passphrase, extensionFullWindowGeneratorMode.password]),
  password: v.strictObject({
    length: v.pipe(v.number(), v.integer(), v.minValue(5), v.maxValue(128)),
    characterPolicy: extensionGeneratorPreferencesCharacterPolicySchema,
  }),
  passphrase: v.strictObject({
    numWords: v.pipe(v.number(), v.integer(), v.minValue(3), v.maxValue(20)),
    wordSeparator: v.pipe(
      v.string(),
      v.check(
        (wordSeparator) => [...wordSeparator].length <= 1,
        "Passphrase word separator must be zero or one character.",
      ),
    ),
    includeNumber: v.boolean(),
  }),
})

export const extensionGeneratorPreferencesSchema = v.strictObject({
  schemaVersion: v.literal(extensionStorageSchemaVersion),
  ...extensionGeneratorPreferencesDataSchema.entries,
})

export type ExtensionGeneratorPreferences = v.InferOutput<typeof extensionGeneratorPreferencesDataSchema>
