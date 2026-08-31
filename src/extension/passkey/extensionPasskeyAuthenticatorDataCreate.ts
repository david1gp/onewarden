import { type Result } from "#result"
import { sha256Digest } from "../../shared/crypto/sha256Digest.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionCoseP256PublicKeyEncode } from "./extensionCoseP256PublicKeyEncode.js"

const aaguid = Uint8Array.from([
  0xd5, 0x48, 0x82, 0x6e, 0x79, 0xb4, 0xdb, 0x40, 0xa3, 0xd8, 0x11, 0x11, 0x6f, 0x7e, 0x83, 0x49,
])

type ExtensionPasskeyAuthenticatorDataOptions = {
  rpId: string
  counter: number
  userVerification: boolean
  credentialId?: Uint8Array
  publicKeyCoordinates?: { x: Uint8Array; y: Uint8Array }
}

function bytesJoin(parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0))
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.byteLength
  }
  return output
}

function counterEncode(counter: number): Result<Uint8Array> {
  if (!Number.isSafeInteger(counter) || counter < 0 || counter > 0xffffffff)
    return resultErrorCreate("extensionPasskeyAuthenticatorDataCreate", "WebAuthn sign counter is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  return resultCreate(
    Uint8Array.from([(counter >>> 24) & 0xff, (counter >>> 16) & 0xff, (counter >>> 8) & 0xff, counter & 0xff]),
  )
}

function flagsCreate(attested: boolean, userVerification: boolean): number {
  return 0x01 | (userVerification ? 0x04 : 0) | 0x08 | 0x10 | (attested ? 0x40 : 0)
}

export async function extensionPasskeyAuthenticatorDataCreate(
  options: ExtensionPasskeyAuthenticatorDataOptions,
): Promise<Result<Uint8Array>> {
  const op = "extensionPasskeyAuthenticatorDataCreate"
  const rpIdHashResult = await sha256Digest(options.rpId)
  if (!rpIdHashResult.success) return rpIdHashResult
  const counterResult = counterEncode(options.counter)
  if (!counterResult.success) return counterResult
  const hasCredentialData = options.credentialId !== undefined || options.publicKeyCoordinates !== undefined
  if (hasCredentialData !== (options.credentialId !== undefined && options.publicKeyCoordinates !== undefined))
    return resultErrorCreate(op, "Attested credential data is incomplete.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })

  const attestedData: Uint8Array[] = []
  if (hasCredentialData) {
    const credentialId = options.credentialId as Uint8Array
    if (credentialId.byteLength === 0 || credentialId.byteLength > 0xffff)
      return resultErrorCreate(op, "Credential ID length is invalid.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    const coseResult = extensionCoseP256PublicKeyEncode(
      (options.publicKeyCoordinates as { x: Uint8Array; y: Uint8Array }).x,
      (options.publicKeyCoordinates as { x: Uint8Array; y: Uint8Array }).y,
    )
    if (!coseResult.success) return coseResult
    attestedData.push(
      aaguid,
      Uint8Array.from([(credentialId.byteLength >> 8) & 0xff, credentialId.byteLength & 0xff]),
      credentialId,
      coseResult.data,
    )
  }
  return resultCreate(
    bytesJoin([
      rpIdHashResult.data,
      Uint8Array.of(flagsCreate(hasCredentialData, options.userVerification)),
      counterResult.data,
      ...attestedData,
    ]),
  )
}
