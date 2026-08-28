import { type Result } from "#result"
import { hmacSha256Digest } from "./hmacSha256Digest.js"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"

const SHA256_LENGTH = 32
const HKDF_MAX_OUTPUT_LENGTH = 255 * SHA256_LENGTH

export async function hkdfSha256Expand(
  pseudorandomKey: Uint8Array,
  info: Uint8Array,
  outputLength: number,
): Promise<Result<Uint8Array>> {
  const op = "hkdfSha256Expand"
  if (pseudorandomKey.byteLength !== SHA256_LENGTH) {
    return resultErrorCreate(op, "HKDF-SHA256 pseudorandom key must be 32 bytes.")
  }
  if (!Number.isSafeInteger(outputLength) || outputLength < 0 || outputLength > HKDF_MAX_OUTPUT_LENGTH) {
    return resultErrorCreate(op, "HKDF-SHA256 output length is invalid.")
  }
  if (outputLength === 0) return resultCreate(new Uint8Array())

  const blockCount = Math.ceil(outputLength / SHA256_LENGTH)
  const output = new Uint8Array(blockCount * SHA256_LENGTH)
  let previousBlock: Uint8Array<ArrayBufferLike> = new Uint8Array()

  for (let blockNumber = 1; blockNumber <= blockCount; blockNumber += 1) {
    const input = new Uint8Array(previousBlock.byteLength + info.byteLength + 1)
    input.set(previousBlock)
    input.set(info, previousBlock.byteLength)
    input[input.byteLength - 1] = blockNumber
    const blockResult = await hmacSha256Digest(pseudorandomKey, input)
    if (!blockResult.success) return blockResult
    previousBlock = blockResult.data
    output.set(previousBlock, (blockNumber - 1) * SHA256_LENGTH)
  }

  return resultCreate(output.slice(0, outputLength))
}
