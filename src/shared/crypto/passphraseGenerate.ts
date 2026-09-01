import type { Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import { effLongWordList } from "./effLongWordList.js"
import { secureRandomBytes } from "./secureRandomBytes.js"

const PASSPHRASE_WORDS_DEFAULT = 3
const PASSPHRASE_WORDS_MIN = 3
const PASSPHRASE_WORDS_MAX = 20
const PASSPHRASE_SEPARATOR_DEFAULT = "-"
const PASSPHRASE_DIGITS = "0123456789"

type PassphraseGenerateOptions = {
  numWords?: number
  wordSeparator?: string
  includeNumber?: boolean
}

function passphraseGenerateIndex(maxExclusive: number): Result<number> {
  const byteLength = Math.ceil(Math.log2(maxExclusive) / 8)
  const valueLimit = 2 ** (byteLength * 8)
  const acceptedValueLimit = valueLimit - (valueLimit % maxExclusive)

  while (true) {
    const randomBytesResult = secureRandomBytes(byteLength)
    if (!randomBytesResult.success) return randomBytesResult

    let randomValue = 0
    for (const randomByte of randomBytesResult.data) randomValue = randomValue * 256 + randomByte
    if (randomValue >= acceptedValueLimit) continue
    return resultCreate(randomValue % maxExclusive)
  }
}

function passphraseGenerateCharacter(characters: string): Result<string> {
  const indexResult = passphraseGenerateIndex(characters.length)
  if (!indexResult.success) return indexResult
  const character = characters[indexResult.data]
  if (character === undefined) return resultErrorCreate("passphraseGenerate", "Generated character was unavailable.")
  return resultCreate(character)
}

export function passphraseGenerate(options: PassphraseGenerateOptions = {}): Result<string> {
  const op = "passphraseGenerate"
  const numWords = options.numWords ?? PASSPHRASE_WORDS_DEFAULT
  if (!Number.isSafeInteger(numWords) || numWords < PASSPHRASE_WORDS_MIN || numWords > PASSPHRASE_WORDS_MAX) {
    return resultErrorCreate(
      op,
      `Passphrase word count must be an integer from ${PASSPHRASE_WORDS_MIN} to ${PASSPHRASE_WORDS_MAX}.`,
    )
  }

  const wordSeparator = options.wordSeparator ?? PASSPHRASE_SEPARATOR_DEFAULT
  if (typeof wordSeparator !== "string" || [...wordSeparator].length > 1) {
    return resultErrorCreate(op, "Passphrase word separator must be zero or one character.")
  }

  const includeNumber = options.includeNumber ?? true
  let numberWordIndex = -1
  if (includeNumber) {
    const numberWordIndexResult = passphraseGenerateIndex(numWords)
    if (!numberWordIndexResult.success) return numberWordIndexResult
    numberWordIndex = numberWordIndexResult.data
  }

  const generatedWords: string[] = []
  for (let wordIndex = 0; wordIndex < numWords; wordIndex += 1) {
    const wordIndexResult = passphraseGenerateIndex(effLongWordList.length)
    if (!wordIndexResult.success) return wordIndexResult
    const word = effLongWordList[wordIndexResult.data]
    if (word === undefined) return resultErrorCreate(op, "Generated passphrase word was unavailable.")

    if (wordIndex !== numberWordIndex) {
      generatedWords.push(word)
      continue
    }

    const digitResult = passphraseGenerateCharacter(PASSPHRASE_DIGITS)
    if (!digitResult.success) return digitResult
    generatedWords.push(`${word}${digitResult.data}`)
  }

  return resultCreate(generatedWords.join(wordSeparator))
}
