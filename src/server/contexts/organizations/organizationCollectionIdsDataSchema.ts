import * as v from "valibot"
import { collectionIdSchema } from "./collectionIdSchema.js"

export const organizationCollectionIdsDataSchema = v.object({ ids: v.array(collectionIdSchema) })

export type OrganizationCollectionIdsData = v.InferOutput<typeof organizationCollectionIdsDataSchema>
