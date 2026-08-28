import * as v from "valibot"

export const identityAccountAvatarDataSchema = v.object({ avatarColor: v.nullish(v.string()) })

export type IdentityAccountAvatarData = v.InferOutput<typeof identityAccountAvatarDataSchema>
