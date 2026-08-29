import { expect, test } from "bun:test"
import * as v from "valibot"
import { identityAccountKdfDataSchema } from "../../../src/server/contexts/identity/identityAccountKdfDataSchema.js"
import { identityKdfSchema } from "../../../src/server/contexts/identity/identityKdfSchema.js"
import { identityRegistrationDataSchema } from "../../../src/server/contexts/identity/identityRegistrationDataSchema.js"

const kdfBoundaryInput = {
  kdf: -2_147_483_648,
  kdfType: 2_147_483_647,
  kdfIterations: 0,
  iterations: 1,
  kdfMemory: null,
  memory: -2_147_483_648,
  kdfParallelism: 2_147_483_647,
  parallelism: undefined,
}

test("identity KDF schemas preserve shared integer boundaries and object behavior", () => {
  const schemas = [identityKdfSchema, identityAccountKdfDataSchema]

  for (const schema of schemas) {
    const result = v.safeParse(schema, { ...kdfBoundaryInput, unknown: "discarded" })

    expect(result.success).toBe(true)
    if (result.success) expect(result.output).toEqual(kdfBoundaryInput)
  }

  const registrationResult = v.safeParse(identityRegistrationDataSchema, {
    email: "boundary@example.com",
    ...kdfBoundaryInput,
    unknown: "discarded",
  })

  expect(registrationResult.success).toBe(true)
  if (registrationResult.success) {
    expect(registrationResult.output).toEqual({
      email: "boundary@example.com",
      ...kdfBoundaryInput,
    })
  }
})

test("identity KDF schemas reject non-integers and values outside signed 32-bit bounds", () => {
  for (const schema of [identityKdfSchema, identityAccountKdfDataSchema]) {
    expect(v.safeParse(schema, { kdf: 1.5 }).success).toBe(false)
    expect(v.safeParse(schema, { kdfIterations: 2_147_483_648 }).success).toBe(false)
    expect(v.safeParse(schema, { kdfMemory: -2_147_483_649 }).success).toBe(false)
  }

  expect(v.safeParse(identityRegistrationDataSchema, { email: "invalid@example.com", kdf: null }).success).toBe(false)
  expect(
    v.safeParse(identityRegistrationDataSchema, {
      email: "invalid@example.com",
      kdfParallelism: 2_147_483_648,
    }).success,
  ).toBe(false)
})

test("identity KDF schemas preserve optional and nullish field semantics", () => {
  for (const schema of [identityKdfSchema, identityAccountKdfDataSchema]) {
    expect(v.safeParse(schema, {}).success).toBe(true)
    expect(v.safeParse(schema, { kdfMemory: null, kdfParallelism: null }).success).toBe(true)
    expect(v.safeParse(schema, { kdf: null }).success).toBe(false)
    expect(v.safeParse(schema, { kdfMemory: "null" }).success).toBe(false)
  }

  expect(v.safeParse(identityRegistrationDataSchema, { email: "minimal@example.com" }).success).toBe(true)
  expect(v.safeParse(identityRegistrationDataSchema, {}).success).toBe(false)
})
