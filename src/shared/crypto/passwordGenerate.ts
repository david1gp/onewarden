import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import { secureRandomBytes } from "./secureRandomBytes.js"

const PASSWORD_LENGTH_DEFAULT = 20
const PASSWORD_LENGTH_MIN = 1
const PASSWORD_LENGTH_MAX = 128
const PASSWORD_CHARACTER_SETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=",
} as const

type PasswordGenerateOptions = {
  length?: number
  characterPolicy?: {
    lowercase?: boolean
    uppercase?: boolean
    numbers?: boolean
    symbols?: boolean
  }
}

type PasswordCharacterSet = {
  characters: string
  enabled: boolean
}

function passwordGenerateIndex(maxExclusive: number): Result<number> {
  const op = "passwordGenerate"
  const acceptedByteLimit = 256 - (256 % maxExclusive)

  while (true) {
    const randomBytesResult = secureRandomBytes(1)
    if (!randomBytesResult.success) return randomBytesResult
    const randomByte = randomBytesResult.data[0]
    if (randomByte === undefined) return resultErrorCreate(op, "Secure random byte generation returned no byte.")
    if (randomByte >= acceptedByteLimit) continue
    return resultCreate(randomByte % maxExclusive)
  }
}

function passwordGenerateCharacter(characters: string): Result<string> {
  const indexResult = passwordGenerateIndex(characters.length)
  if (!indexResult.success) return indexResult
  const character = characters[indexResult.data]
  if (character === undefined) return resultErrorCreate("passwordGenerate", "Generated character was unavailable.")
  return resultCreate(character)
}

export function passwordGenerate(options: PasswordGenerateOptions = {}): Result<string> {
  const op = "passwordGenerate"
  const length = options.length ?? PASSWORD_LENGTH_DEFAULT
  if (!Number.isSafeInteger(length) || length < PASSWORD_LENGTH_MIN || length > PASSWORD_LENGTH_MAX) {
    return resultErrorCreate(
      op,
      `Password length must be an integer from ${PASSWORD_LENGTH_MIN} to ${PASSWORD_LENGTH_MAX}.`,
    )
  }

  const characterPolicy = options.characterPolicy ?? {}
  const characterSets: PasswordCharacterSet[] = [
    { characters: PASSWORD_CHARACTER_SETS.lowercase, enabled: characterPolicy.lowercase ?? true },
    { characters: PASSWORD_CHARACTER_SETS.uppercase, enabled: characterPolicy.uppercase ?? true },
    { characters: PASSWORD_CHARACTER_SETS.numbers, enabled: characterPolicy.numbers ?? true },
    { characters: PASSWORD_CHARACTER_SETS.symbols, enabled: characterPolicy.symbols ?? true },
  ]
  const enabledCharacterSets = characterSets.filter((characterSet) => characterSet.enabled)
  if (enabledCharacterSets.length === 0) {
    return resultErrorCreate(op, "At least one password character policy must be enabled.")
  }
  if (length < enabledCharacterSets.length) {
    return resultErrorCreate(op, "Password length must cover every enabled character policy.")
  }

  const characterPool = enabledCharacterSets.map((characterSet) => characterSet.characters).join("")
  const generatedCharacters: string[] = []
  for (const characterSet of enabledCharacterSets) {
    const characterResult = passwordGenerateCharacter(characterSet.characters)
    if (!characterResult.success) return characterResult
    generatedCharacters.push(characterResult.data)
  }

  while (generatedCharacters.length < length) {
    const characterResult = passwordGenerateCharacter(characterPool)
    if (!characterResult.success) return characterResult
    generatedCharacters.push(characterResult.data)
  }

  for (let index = generatedCharacters.length - 1; index > 0; index -= 1) {
    const swapIndexResult = passwordGenerateIndex(index + 1)
    if (!swapIndexResult.success) return swapIndexResult
    const swapIndex = swapIndexResult.data
    const currentCharacter = generatedCharacters[index]
    const swapCharacter = generatedCharacters[swapIndex]
    if (currentCharacter === undefined || swapCharacter === undefined) {
      return resultErrorCreate(op, "Generated password character was unavailable.")
    }
    generatedCharacters[index] = swapCharacter
    generatedCharacters[swapIndex] = currentCharacter
  }

  return resultCreate(generatedCharacters.join(""))
}
