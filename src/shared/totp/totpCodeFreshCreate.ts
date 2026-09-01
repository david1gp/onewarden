import type { Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import { totpCodeCreateAtCounter } from "./totpCodeCreateAtCounter.js"
import { totpSecretParse } from "./totpSecretParse.js"

/** Generates a code and retries when its time step changes while Web Crypto is running. */
export async function totpCodeFreshCreate(
  value: string,
  nowSeconds: () => number = () => Date.now() / 1_000,
): Promise<Result<string>> {
  const op = "totpCodeFreshCreate"
  const secretResult = totpSecretParse(value)
  if (!secretResult.success) return resultErrorCreate(op, secretResult.errorMessage)
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const before = nowSeconds()
    const counter = Math.floor(before / secretResult.data.period)
    if (!Number.isFinite(before) || before < 0 || !Number.isSafeInteger(counter)) {
      return resultErrorCreate(op, "Invalid TOTP time.")
    }
    const codeResult = await totpCodeCreateAtCounter(secretResult.data, counter)
    if (!codeResult.success) return resultErrorCreate(op, codeResult.errorMessage)
    if (Math.floor(nowSeconds() / secretResult.data.period) === counter) return resultCreate(codeResult.data)
  }
  return resultErrorCreate(op, "TOTP time changed during generation.")
}
