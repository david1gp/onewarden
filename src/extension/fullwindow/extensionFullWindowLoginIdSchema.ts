import * as v from "valibot"

export const extensionFullWindowLoginIdSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128))

export type ExtensionFullWindowLoginId = v.InferOutput<typeof extensionFullWindowLoginIdSchema>
