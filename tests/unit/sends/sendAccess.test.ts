import { expect, test } from "bun:test"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { sendCreate } from "../../../src/server/contexts/sends/sendCreate.js"
import { sendRegisterAccess } from "../../../src/server/contexts/sends/sendRegisterAccess.js"
import { sendFindByUuid } from "../../../src/server/contexts/sends/sendFindByUuid.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"

const date = "2026-08-28T00:00:00.000Z"
const user: IdentityUser = {
  uuid: "send-user",
  enabled: true,
  createdAt: date,
  updatedAt: date,
  verifiedAt: null,
  lastVerifyingAt: null,
  loginVerifyCount: 0,
  email: "send@example.com",
  emailNew: null,
  emailNewToken: null,
  name: "Send User",
  passwordHash: new Uint8Array([1]),
  salt: new Uint8Array([2]),
  passwordIterations: 100_000,
  passwordHint: null,
  akey: "akey",
  privateKey: null,
  publicKey: null,
  securityStamp: "stamp",
  stampException: null,
  equivalentDomains: "[]",
  excludedGlobals: "[]",
  clientKdfType: 0,
  clientKdfIter: 600_000,
  clientKdfMemory: null,
  clientKdfParallelism: null,
  apiKey: null,
  avatarColor: null,
  externalId: null,
}

test("Send access registration atomically stops at maxAccessCount", async () => {
  const databaseResult = databaseTestCreate()
  expect(databaseResult.success).toBe(true)
  if (!databaseResult.success) return
  const database = databaseResult.data
  expect(identityUserSave(database, user).success).toBe(true)
  const clock = clockTestCreate(date)
  const createResult = await sendCreate(
    database,
    user.uuid,
    {
      type: 0,
      key: "key",
      password: null,
      maxAccessCount: 1,
      expirationDate: null,
      deletionDate: "2026-09-01T00:00:00.000Z",
      disabled: false,
      hideEmail: false,
      emails: undefined,
      name: "Limited",
      notes: null,
      text: { value: "secret" },
      file: null,
      fileLength: null,
      id: null,
    },
    clock,
    identifierTestCreate(["send-limited"]),
  )
  expect(createResult.success).toBe(true)
  if (!createResult.success) return
  expect(sendRegisterAccess(database, createResult.data, clock)).toEqual({ success: true, data: true })
  expect(sendRegisterAccess(database, createResult.data, clock)).toEqual({ success: true, data: false })
  expect(sendFindByUuid(database, createResult.data.uuid)).toMatchObject({ success: true, data: { accessCount: 1 } })
  databaseClose(database)
})
