import * as v from "valibot"

export const accountAvatarUpdateRequestSchema = v.object({
  avatarColor: v.nullable(v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/))),
})

export type AccountAvatarUpdateRequest = v.InferOutput<typeof accountAvatarUpdateRequestSchema>
