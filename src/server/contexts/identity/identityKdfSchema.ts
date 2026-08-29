import * as v from "valibot"
import { identityKdfFieldsSchema } from "./identityKdfFieldsSchema.js"

export const identityKdfSchema = v.object(identityKdfFieldsSchema)

export type IdentityKdf = v.InferOutput<typeof identityKdfSchema>
