import * as v from "valibot"

export const sessionHandoffOperationSchema = v.picklist(["create", "edit"])

export type SessionHandoffOperation = v.InferOutput<typeof sessionHandoffOperationSchema>
