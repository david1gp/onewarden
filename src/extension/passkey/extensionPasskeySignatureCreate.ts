import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionP1363ToDer } from "./extensionP1363ToDer.js"

export async function extensionPasskeySignatureCreate(
  authenticatorData: Uint8Array,
  clientDataHash: Uint8Array,
  privateKey: CryptoKey,
): Promise<Result<Uint8Array>> {
  const op = "extensionPasskeySignatureCreate"
  try {
    const signature = new Uint8Array(
      await crypto.subtle.sign(
        { name: "ECDSA", hash: { name: "SHA-256" } },
        privateKey,
        Uint8Array.from([...authenticatorData, ...clientDataHash]),
      ),
    )
    const derResult = extensionP1363ToDer(signature)
    if (!derResult.success) return derResult
    return resultCreate(derResult.data)
  } catch {
    return resultErrorCreate(op, "WebAuthn signature generation failed.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
}
