import * as v from "valibot"

const extensionLoginFillDataStatusSchema = v.picklist(["filled", "partiallyFilled", "noFields"])

export const extensionLoginFillDataSchema = v.strictObject({
  status: extensionLoginFillDataStatusSchema,
  usernameFilled: v.boolean(),
  passwordFilled: v.boolean(),
})

export type ExtensionLoginFillData = v.InferOutput<typeof extensionLoginFillDataSchema>
