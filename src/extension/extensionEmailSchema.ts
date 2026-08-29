import * as v from "valibot"

export const extensionEmailSchema = v.pipe(v.string(), v.trim(), v.minLength(1))
