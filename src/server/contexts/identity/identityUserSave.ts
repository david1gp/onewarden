import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { users, type UserInsert } from "../../database/schema/users.js"
import type { IdentityUser } from "./identityUser.js"

export function identityUserSave(database: DatabaseConnection, user: IdentityUser): Result<void> {
  const op = "identityUserSave"
  try {
    const values: UserInsert = {
      uuid: user.uuid,
      enabled: user.enabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      verifiedAt: user.verifiedAt,
      lastVerifyingAt: user.lastVerifyingAt,
      loginVerifyCount: user.loginVerifyCount,
      email: user.email,
      emailNew: user.emailNew,
      emailNewToken: user.emailNewToken,
      name: user.name,
      passwordHash: Buffer.from(user.passwordHash),
      salt: Buffer.from(user.salt),
      passwordIterations: user.passwordIterations,
      passwordHint: user.passwordHint,
      akey: user.akey,
      privateKey: user.privateKey,
      publicKey: user.publicKey,
      securityStamp: user.securityStamp,
      stampException: user.stampException,
      equivalentDomains: user.equivalentDomains,
      excludedGlobals: user.excludedGlobals,
      clientKdfType: user.clientKdfType,
      clientKdfIter: user.clientKdfIter,
      clientKdfMemory: user.clientKdfMemory,
      clientKdfParallelism: user.clientKdfParallelism,
      apiKey: user.apiKey,
      avatarColor: user.avatarColor,
      externalId: user.externalId,
      totpRecover: user.totpRecover ?? null,
    }
    database.drizzle
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.uuid,
        set: {
          enabled: values.enabled,
          updatedAt: values.updatedAt,
          verifiedAt: values.verifiedAt,
          lastVerifyingAt: values.lastVerifyingAt,
          loginVerifyCount: values.loginVerifyCount,
          email: values.email,
          emailNew: values.emailNew,
          emailNewToken: values.emailNewToken,
          name: values.name,
          passwordHash: values.passwordHash,
          salt: values.salt,
          passwordIterations: values.passwordIterations,
          passwordHint: values.passwordHint,
          akey: values.akey,
          privateKey: values.privateKey,
          publicKey: values.publicKey,
          securityStamp: values.securityStamp,
          stampException: values.stampException,
          equivalentDomains: values.equivalentDomains,
          excludedGlobals: values.excludedGlobals,
          totpRecover: values.totpRecover,
          clientKdfType: values.clientKdfType,
          clientKdfIter: values.clientKdfIter,
          clientKdfMemory: values.clientKdfMemory,
          clientKdfParallelism: values.clientKdfParallelism,
          apiKey: values.apiKey,
          avatarColor: values.avatarColor,
          externalId: values.externalId,
        },
      })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "User save failed.")
  }
}
