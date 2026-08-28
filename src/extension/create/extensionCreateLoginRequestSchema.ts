import * as v from "valibot"

const nonEmptyNameSchema = v.pipe(v.string(), v.trim(), v.minLength(1))
const uriValueSchema = v.pipe(v.string(), v.trim(), v.minLength(1))
const customFieldTypeSchema = v.union([v.picklist(["text", "hidden", "boolean"]), v.picklist([0, 1, 2])])

const extensionCreateLoginUriSchema = v.union([
  uriValueSchema,
  v.strictObject({
    uri: uriValueSchema,
    match: v.optional(v.nullish(v.number())),
  }),
])

const extensionCreateLoginFieldSchema = v.strictObject({
  name: nonEmptyNameSchema,
  type: customFieldTypeSchema,
  value: v.union([v.string(), v.boolean()]),
})

export const extensionCreateLoginRequestSchema = v.strictObject({
  draftId: v.optional(nonEmptyNameSchema),
  name: nonEmptyNameSchema,
  uris: v.pipe(v.array(extensionCreateLoginUriSchema), v.minLength(1)),
  username: v.optional(v.nullable(v.string()), null),
  password: v.optional(v.nullable(v.string()), null),
  notes: v.optional(v.nullable(v.string()), null),
  favorite: v.optional(v.boolean(), false),
  folderId: v.optional(v.nullable(nonEmptyNameSchema), null),
  fields: v.optional(v.array(extensionCreateLoginFieldSchema), []),
})

export type ExtensionCreateLoginRequest = v.InferOutput<typeof extensionCreateLoginRequestSchema>
