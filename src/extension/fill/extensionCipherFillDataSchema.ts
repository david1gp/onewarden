import * as v from "valibot"

export const extensionCipherFillDataSchema = v.strictObject({
  status: v.picklist(["filled", "partiallyFilled", "noFields"]),
  filledCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  requestedCount: v.pipe(v.number(), v.integer(), v.minValue(1)),
})

export type ExtensionCipherFillData = v.InferOutput<typeof extensionCipherFillDataSchema>
