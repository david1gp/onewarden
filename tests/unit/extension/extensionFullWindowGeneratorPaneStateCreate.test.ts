import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { extensionFullWindowGeneratorMode } from "../../../src/extension/fullwindow/ExtensionFullWindowGeneratorMode.js"
import { extensionFullWindowGeneratorPaneStateCreate } from "../../../src/extension/fullwindow/extensionFullWindowGeneratorPaneStateCreate.js"
import { extensionGeneratorPreferencesDefault } from "../../../src/extension/storage/extensionGeneratorPreferencesDefault.js"
import type { ExtensionGeneratorPreferences } from "../../../src/extension/storage/extensionGeneratorPreferencesSchema.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"

test("generator pane defaults to passphrase mode and generates its default output", () => {
  const passphraseCalls: unknown[] = []
  const root = createRoot((dispose) => ({
    dispose,
    state: extensionFullWindowGeneratorPaneStateCreate({
      passphraseGenerate: (options) => {
        passphraseCalls.push(options)
        return resultCreate("alpha-beta3-gamma")
      },
    }),
  }))

  expect(root.state.modeSignal.get()).toBe(extensionFullWindowGeneratorMode.passphrase)
  expect(root.state.passphraseMode()).toBe(true)
  expect(root.state.wordCount()).toBe(3)
  expect(root.state.wordSeparator()).toBe("-")
  expect(root.state.includeNumber()).toBe(true)
  expect(root.state.password()).toBe("alpha-beta3-gamma")
  expect(passphraseCalls).toEqual([{ numWords: 3, wordSeparator: "-", includeNumber: true }])

  root.dispose()
})

test("generator pane switches between passphrase and password generation", () => {
  const passphraseCalls: unknown[] = []
  const passwordCalls: unknown[] = []
  const root = createRoot((dispose) => ({
    dispose,
    state: extensionFullWindowGeneratorPaneStateCreate({
      passphraseGenerate: (options) => {
        passphraseCalls.push(options)
        return resultCreate(passphraseCalls.length === 1 ? "first-phrase3" : "second-phrase")
      },
      passwordGenerate: (options) => {
        passwordCalls.push(options)
        return resultCreate("preserved-password")
      },
    }),
  }))

  root.state.modeSignal.set(extensionFullWindowGeneratorMode.password)
  expect(root.state.modeSignal.get()).toBe(extensionFullWindowGeneratorMode.password)
  expect(root.state.passphraseMode()).toBe(false)
  expect(root.state.password()).toBe("preserved-password")
  expect(passwordCalls).toEqual([
    {
      length: 20,
      characterPolicy: { lowercase: true, uppercase: true, numbers: true, symbols: true },
    },
  ])

  root.state.modeSignal.set(extensionFullWindowGeneratorMode.passphrase)
  expect(root.state.modeSignal.get()).toBe(extensionFullWindowGeneratorMode.passphrase)
  expect(root.state.passphraseMode()).toBe(true)
  expect(root.state.password()).toBe("second-phrase")
  expect(passphraseCalls).toHaveLength(2)

  root.dispose()
})

test("generator pane passes passphrase controls to regeneration and clamps word counts", () => {
  const passphraseCalls: unknown[] = []
  const root = createRoot((dispose) => ({
    dispose,
    state: extensionFullWindowGeneratorPaneStateCreate({
      passphraseGenerate: (options) => {
        passphraseCalls.push(options)
        return resultCreate(`${options.numWords}${options.wordSeparator}${options.includeNumber ? "number" : "plain"}`)
      },
    }),
  }))

  root.state.wordCountSet(2)
  expect(root.state.wordCount()).toBe(3)
  root.state.wordCountSet(20.9)
  expect(root.state.wordCount()).toBe(20)
  root.state.wordSeparatorSet("|")
  root.state.includeNumberSet(false)
  expect(root.state.wordSeparator()).toBe("|")
  expect(root.state.includeNumber()).toBe(false)
  expect(root.state.password()).toBe("20|plain")

  root.state.passwordRegenerate()
  expect(passphraseCalls.at(-1)).toEqual({ numWords: 20, wordSeparator: "|", includeNumber: false })

  root.dispose()
})

test("generator pane preserves password controls and output in password mode", () => {
  const passwordCalls: unknown[] = []
  const root = createRoot((dispose) => ({
    dispose,
    state: extensionFullWindowGeneratorPaneStateCreate({
      initialMode: extensionFullWindowGeneratorMode.password,
      passwordGenerate: (options) => {
        passwordCalls.push(options)
        return resultCreate(options.length === 20 ? "initial-password" : "long-password")
      },
    }),
  }))

  expect(root.state.passphraseMode()).toBe(false)
  expect(root.state.password()).toBe("initial-password")
  root.state.passwordLengthSet(32)
  expect(root.state.password()).toBe("long-password")
  expect(passwordCalls.at(-1)).toEqual({
    length: 32,
    characterPolicy: { lowercase: true, uppercase: true, numbers: true, symbols: true },
  })

  root.state.passwordVisibilityToggle()
  expect(root.state.passwordVisible()).toBe(true)

  root.dispose()
})

test("generator pane saves mode and every password and passphrase preference change", () => {
  const changes: ExtensionGeneratorPreferences[] = []
  const root = createRoot((dispose) => ({
    dispose,
    state: extensionFullWindowGeneratorPaneStateCreate({
      passphraseGenerate: () => resultCreate("phrase"),
      passwordGenerate: () => resultCreate("password"),
      onPreferencesChange: (preferences) => changes.push(preferences),
    }),
  }))

  root.state.modeSignal.set(extensionFullWindowGeneratorMode.password)
  expect(changes.at(-1)?.mode).toBe(extensionFullWindowGeneratorMode.password)

  root.state.passwordLengthSet(32)
  expect(changes.at(-1)?.password.length).toBe(32)

  root.state.symbolsSet(false)
  expect(changes.at(-1)?.password.characterPolicy.symbols).toBe(false)
  root.state.numbersSet(false)
  expect(changes.at(-1)?.password.characterPolicy.numbers).toBe(false)
  root.state.uppercaseSet(false)
  expect(changes.at(-1)?.password.characterPolicy.uppercase).toBe(false)
  root.state.uppercaseSet(true)
  root.state.lowercaseSet(false)
  expect(changes.at(-1)?.password.characterPolicy.lowercase).toBe(false)

  root.state.wordCountSet(8)
  expect(changes.at(-1)?.passphrase.numWords).toBe(8)
  root.state.wordSeparatorSet("_")
  expect(changes.at(-1)?.passphrase.wordSeparator).toBe("_")
  root.state.includeNumberSet(false)
  expect(changes.at(-1)?.passphrase.includeNumber).toBe(false)

  expect(changes).toHaveLength(10)
  root.dispose()
})

test("generator pane does not include generated, revealed, copied, or error state in saved preferences", async () => {
  const changes: ExtensionGeneratorPreferences[] = []
  const initialPreferences: ExtensionGeneratorPreferences = {
    ...extensionGeneratorPreferencesDefault,
    mode: extensionFullWindowGeneratorMode.password,
  }
  const root = createRoot((dispose) => ({
    dispose,
    state: extensionFullWindowGeneratorPaneStateCreate({
      initialPreferences,
      initialPassword: "generated-secret",
      initialPasswordVisible: true,
      initialCopyStatus: "copied",
      initialErrorMessage: "Transient generation error",
      passwordGenerate: () => resultCreate("new-secret"),
      clipboardWrite: async () => undefined,
      onPreferencesChange: (preferences) => changes.push(preferences),
    }),
  }))

  expect(root.state.password()).toBe("generated-secret")
  expect(root.state.passwordVisible()).toBe(true)
  expect(root.state.copyStatus()).toBe("copied")
  expect(root.state.errorMessage()).toBe("Transient generation error")

  root.state.passwordVisibilityToggle()
  await root.state.passwordCopy()
  expect(root.state.passwordVisible()).toBe(false)
  expect(root.state.copyStatus()).toBe("copied")
  expect(changes).toHaveLength(0)

  root.state.passwordLengthSet(32)
  expect(changes).toEqual([
    {
      mode: extensionFullWindowGeneratorMode.password,
      password: {
        length: 32,
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
    },
  ])
  root.dispose()
})
