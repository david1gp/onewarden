import * as v from "valibot"

export const cipherDialogModeSchema = v.picklist(["view", "edit", "create"])

export type CipherDialogMode = v.InferOutput<typeof cipherDialogModeSchema>
