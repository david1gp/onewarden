import type { KeyObject } from "node:crypto"

export type RsaKeyPair = {
  privateKey: KeyObject
  publicKey: KeyObject
  privateKeyPem: string
  publicKeyPem: string
}
