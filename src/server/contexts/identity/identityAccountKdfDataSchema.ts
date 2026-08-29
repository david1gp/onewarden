import * as v from "valibot"
import { identityKdfFieldsSchema } from "./identityKdfFieldsSchema.js"

export const identityAccountKdfDataSchema = v.object(identityKdfFieldsSchema)

export type IdentityAccountKdfData = v.InferOutput<typeof identityAccountKdfDataSchema>
