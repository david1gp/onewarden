import * as v from "valibot"
import { base64Decode } from "../../../shared/crypto/base64Decode.js"

const bitwardenPortableSaltSchema = v.pipe(
  v.string(),
  v.check((value) => {
    const decoded = base64Decode(value)
    return decoded.success && decoded.data.byteLength === 16
  }, "Bitwarden portable export salt must be canonical Base64 for 16 bytes."),
)

export const bitwardenPortableEncryptedJsonEnvelopeSchema = v.object({
  encrypted: v.literal(true),
  passwordProtected: v.literal(true),
  salt: bitwardenPortableSaltSchema,
  kdfIterations: v.number(),
  kdfType: v.number(),
  kdfMemory: v.optional(v.number()),
  kdfParallelism: v.optional(v.number()),
  encKeyValidation_DO_NOT_EDIT: v.pipe(v.string(), v.minLength(1)),
  data: v.pipe(v.string(), v.minLength(1)),
})

export type BitwardenPortableEncryptedJsonEnvelope = v.InferOutput<typeof bitwardenPortableEncryptedJsonEnvelopeSchema>
