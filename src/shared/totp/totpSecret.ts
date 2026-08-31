import type { TotpHashAlgorithm } from "./totpHashAlgorithm.js"

export type TotpSecret = {
  secret: string
  algorithm: TotpHashAlgorithm
  digits: 6 | 8
  period: number
}
