import { createMemo, type JSX } from "solid-js"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import { passphraseGenerate } from "../../shared/crypto/passphraseGenerate.js"
import { passwordGenerate } from "../../shared/crypto/passwordGenerate.js"
import type { ExtensionGeneratorPreferences } from "../storage/extensionGeneratorPreferencesSchema.js"
import { extensionGeneratorPreferencesDefault } from "../storage/extensionGeneratorPreferencesDefault.js"
import { extensionFullWindowGeneratorMode } from "./ExtensionFullWindowGeneratorMode.js"

type PasswordCopyStatus = "idle" | "copying" | "copied" | "error"

const PASSPHRASE_WORDS_MIN = 3
const PASSPHRASE_WORDS_MAX = 20

/** Local controls and secure generation state for the full-window passphrase and password generator. */
export function extensionFullWindowGeneratorPaneStateCreate(
  options: {
    initialMode?: keyof typeof extensionFullWindowGeneratorMode
    initialPreferences?: ExtensionGeneratorPreferences
    initialPassword?: string
    initialPasswordVisible?: boolean
    initialCopyStatus?: PasswordCopyStatus
    initialErrorMessage?: string | null
    passwordGenerate?: typeof passwordGenerate
    passphraseGenerate?: typeof passphraseGenerate
    clipboardWrite?: (value: string) => Promise<void>
    onPreferencesChange?: (preferences: ExtensionGeneratorPreferences) => void
  } = {},
) {
  const initialPreferences: ExtensionGeneratorPreferences = options.initialPreferences ?? {
    ...extensionGeneratorPreferencesDefault,
    mode: options.initialMode ?? extensionFullWindowGeneratorMode.passphrase,
  }
  const modeValueSignal = createSignalObject<string>(initialPreferences.mode)
  const lengthSignal = createSignalObject(initialPreferences.password.length)
  const lowercaseSignal = createSignalObject(initialPreferences.password.characterPolicy.lowercase)
  const uppercaseSignal = createSignalObject(initialPreferences.password.characterPolicy.uppercase)
  const numbersSignal = createSignalObject(initialPreferences.password.characterPolicy.numbers)
  const symbolsSignal = createSignalObject(initialPreferences.password.characterPolicy.symbols)
  const wordCountSignal = createSignalObject(initialPreferences.passphrase.numWords)
  const wordSeparatorSignal = createSignalObject(initialPreferences.passphrase.wordSeparator)
  const includeNumberSignal = createSignalObject(initialPreferences.passphrase.includeNumber)
  const passwordSignal = createSignalObject(options.initialPassword ?? "")
  const passwordVisibleSignal = createSignalObject(options.initialPasswordVisible ?? false)
  const copyStatusSignal = createSignalObject<PasswordCopyStatus>(options.initialCopyStatus ?? "idle")
  const errorMessageSignal = createSignalObject<string | null>(options.initialErrorMessage ?? null)

  const passphraseMode = () => modeValueSignal.get() === extensionFullWindowGeneratorMode.passphrase

  const enabledCharacterGroupCount = createMemo(
    () =>
      Number(lowercaseSignal.get()) +
      Number(uppercaseSignal.get()) +
      Number(numbersSignal.get()) +
      Number(symbolsSignal.get()),
  )

  const preferencesChanged = () => {
    options.onPreferencesChange?.({
      mode: modeValueSignal.get() as ExtensionGeneratorPreferences["mode"],
      password: {
        length: lengthSignal.get(),
        characterPolicy: {
          lowercase: lowercaseSignal.get(),
          uppercase: uppercaseSignal.get(),
          numbers: numbersSignal.get(),
          symbols: symbolsSignal.get(),
        },
      },
      passphrase: {
        numWords: wordCountSignal.get(),
        wordSeparator: wordSeparatorSignal.get(),
        includeNumber: includeNumberSignal.get(),
      },
    })
  }

  const passwordRegenerate = () => {
    const result = passphraseMode()
      ? (options.passphraseGenerate ?? passphraseGenerate)({
          numWords: wordCountSignal.get(),
          wordSeparator: wordSeparatorSignal.get(),
          includeNumber: includeNumberSignal.get(),
        })
      : (options.passwordGenerate ?? passwordGenerate)({
          length: lengthSignal.get(),
          characterPolicy: {
            lowercase: lowercaseSignal.get(),
            uppercase: uppercaseSignal.get(),
            numbers: numbersSignal.get(),
            symbols: symbolsSignal.get(),
          },
        })
    if (!result.success) {
      errorMessageSignal.set(result.errorMessage)
      return
    }
    passwordSignal.set(result.data)
    copyStatusSignal.set("idle")
    errorMessageSignal.set(null)
  }

  const modeSignal: SignalObject<string> = {
    get: modeValueSignal.get,
    set: (mode) => {
      if (!(mode in extensionFullWindowGeneratorMode)) return
      if (mode === modeValueSignal.get()) return
      modeValueSignal.set(mode)
      passwordRegenerate()
      preferencesChanged()
    },
  }

  const characterGroupSet = (signal: SignalObject<boolean>, enabled: boolean) => {
    if (!enabled && enabledCharacterGroupCount() === 1) return
    signal.set(enabled)
    passwordRegenerate()
    preferencesChanged()
  }

  const lowercaseSet = (enabled: boolean) => characterGroupSet(lowercaseSignal, enabled)
  const uppercaseSet = (enabled: boolean) => characterGroupSet(uppercaseSignal, enabled)
  const numbersSet = (enabled: boolean) => characterGroupSet(numbersSignal, enabled)
  const symbolsSet = (enabled: boolean) => characterGroupSet(symbolsSignal, enabled)
  const lowercaseDisabled = createMemo(() => lowercaseSignal.get() && enabledCharacterGroupCount() === 1)
  const uppercaseDisabled = createMemo(() => uppercaseSignal.get() && enabledCharacterGroupCount() === 1)
  const numbersDisabled = createMemo(() => numbersSignal.get() && enabledCharacterGroupCount() === 1)
  const symbolsDisabled = createMemo(() => symbolsSignal.get() && enabledCharacterGroupCount() === 1)

  const passwordVisibilityToggle = () => passwordVisibleSignal.set(!passwordVisibleSignal.get())
  const passwordLengthSet = (length: number) => {
    if (!Number.isFinite(length)) return
    lengthSignal.set(Math.min(128, Math.max(5, Math.trunc(length))))
    passwordRegenerate()
    preferencesChanged()
  }
  const passwordLengthInput: JSX.EventHandlerUnion<HTMLInputElement, InputEvent> = (event) =>
    passwordLengthSet(Number(event.currentTarget.value))

  const wordCountSet = (wordCount: number) => {
    if (!Number.isFinite(wordCount)) return
    wordCountSignal.set(Math.min(PASSPHRASE_WORDS_MAX, Math.max(PASSPHRASE_WORDS_MIN, Math.trunc(wordCount))))
    passwordRegenerate()
    preferencesChanged()
  }
  const wordCountInput: JSX.EventHandlerUnion<HTMLInputElement, InputEvent> = (event) =>
    wordCountSet(Number(event.currentTarget.value))

  const wordSeparatorSet = (wordSeparator: string) => {
    const characters = [...wordSeparator]
    wordSeparatorSignal.set(characters.length === 0 ? "" : (characters.at(-1) ?? ""))
    passwordRegenerate()
    preferencesChanged()
  }
  const wordSeparatorInput: JSX.EventHandlerUnion<HTMLInputElement, InputEvent> = (event) =>
    wordSeparatorSet(event.currentTarget.value)

  const includeNumberSet = (includeNumber: boolean) => {
    includeNumberSignal.set(includeNumber)
    passwordRegenerate()
    preferencesChanged()
  }

  const passwordCopy = async () => {
    copyStatusSignal.set("copying")
    const clipboardWrite = options.clipboardWrite ?? navigator.clipboard?.writeText.bind(navigator.clipboard)
    if (clipboardWrite === undefined) {
      copyStatusSignal.set("error")
      return
    }
    try {
      await clipboardWrite(passwordSignal.get())
      copyStatusSignal.set("copied")
    } catch {
      copyStatusSignal.set("error")
    }
  }

  if (options.initialPassword === undefined) passwordRegenerate()

  return {
    modeSignal,
    modeOptions: () => [extensionFullWindowGeneratorMode.passphrase, extensionFullWindowGeneratorMode.password],
    passphraseMode,
    lengthSignal,
    lowercase: lowercaseSignal.get,
    uppercase: uppercaseSignal.get,
    numbers: numbersSignal.get,
    symbols: symbolsSignal.get,
    lowercaseSet,
    uppercaseSet,
    numbersSet,
    symbolsSet,
    lowercaseDisabled,
    uppercaseDisabled,
    numbersDisabled,
    symbolsDisabled,
    wordCount: wordCountSignal.get,
    wordCountSet,
    wordCountInput,
    wordSeparator: wordSeparatorSignal.get,
    wordSeparatorSet,
    wordSeparatorInput,
    includeNumber: includeNumberSignal.get,
    includeNumberSet,
    password: passwordSignal.get,
    passwordVisible: passwordVisibleSignal.get,
    passwordVisibilityToggle,
    passwordLengthSet,
    passwordLengthInput,
    passwordRegenerate,
    passwordCopy,
    copyStatus: copyStatusSignal.get,
    errorMessage: errorMessageSignal.get,
  }
}
