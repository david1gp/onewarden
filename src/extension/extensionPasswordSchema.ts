import * as v from "valibot"

export const extensionPasswordSchema = v.pipe(v.string(), v.minLength(1))
