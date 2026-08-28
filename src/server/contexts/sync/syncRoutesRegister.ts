import type { Context, Hono } from "hono"
import type { Result } from "#result"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { authenticationClientVersionCompare } from "../authentication/authenticationClientVersionCompare.js"
import { authenticationClientVersionOptionalParse } from "../authentication/authenticationClientVersionOptionalParse.js"
import type { AuthenticationClientVersion } from "../authentication/authenticationClientVersionSchema.js"
import type { AuthenticationContext } from "../authentication/authenticationContext.js"
import { authenticationContextGet } from "../authentication/authenticationContextGet.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddleware } from "../authentication/authenticationMiddleware.js"
import { cipherFindByUser } from "../ciphers/cipherFindByUser.js"
import { cipherToJson } from "../ciphers/cipherToJson.js"
import { folderFindByUser } from "../folders/folderFindByUser.js"
import { folderToJson } from "../folders/folderToJson.js"
import { identityUserProfileToJson } from "../identity/identityUserProfileToJson.js"
import { identityUserSave } from "../identity/identityUserSave.js"
import { sendFindByUser } from "../sends/sendFindByUser.js"
import { sendToJson } from "../sends/sendToJson.js"
import { syncDomainsDataSchema } from "./syncDomainsDataSchema.js"
import { syncGlobalDomains } from "./syncGlobalDomains.js"
import type { SyncRouteOptions } from "./syncRouteOptions.js"

const sshKeyMinimumClientVersion = { build: [], major: 2024, minor: 12, patch: 0, preRelease: [], raw: "2024.12.0" }

export function syncRoutesRegister(app: Hono<AuthenticationEnvironment>, options: SyncRouteOptions): void {
  const authenticate = (routeName: string) =>
    authenticationMiddleware({
      clock: options.clock,
      database: options.database,
      publicKey: options.publicKey,
      publicOrigin: options.publicOrigin,
      routeName,
    })

  const sync = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = syncRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const clientVersionResult = authenticationClientVersionOptionalParse(context.req.header("Bitwarden-Client-Version"))
    if (!clientVersionResult.success) return apiErrorResponseCreate(clientVersionResult)

    const { authentication, database } = requestContext.data
    const foldersResult = folderFindByUser(database, authentication.user.uuid)
    if (!foldersResult.success) return apiErrorResponseCreate(foldersResult)
    const ciphersResult = cipherFindByUser(database, authentication.user.uuid)
    if (!ciphersResult.success) return apiErrorResponseCreate(ciphersResult)
    const sendsResult = sendFindByUser(database, authentication.user.uuid)
    if (!sendsResult.success) return apiErrorResponseCreate(sendsResult)

    const ciphers: Record<string, unknown>[] = []
    for (const cipher of ciphersResult.data) {
      if (!syncCipherVisible(cipher.type, clientVersionResult.data)) continue
      const jsonResult = cipherToJson(database, cipher, authentication.user.uuid)
      if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
      ciphers.push(jsonResult.data)
    }

    const sends: Record<string, unknown>[] = []
    for (const send of sendsResult.data) {
      const jsonResult = sendToJson(send)
      if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
      sends.push(jsonResult.data)
    }

    return context.json({
      profile: identityUserProfileToJson(authentication.user, options.config, database),
      folders: foldersResult.data.map(folderToJson),
      collections: [],
      policies: [],
      ciphers,
      domains: syncExcludeDomains(context) ? null : syncDomainsToJson(authentication.user, false),
      sends,
      userDecryption: syncUserDecryptionToJson(authentication.user),
      object: "sync" as const,
    })
  }

  const getDomains = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = syncRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    return context.json(syncDomainsToJson(requestContext.data.authentication.user, true))
  }

  const updateDomains = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = syncRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, syncDomainsDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const user = requestContext.data.authentication.user
    user.equivalentDomains = JSON.stringify(bodyResult.data.equivalentDomains ?? [])
    user.excludedGlobals = JSON.stringify(bodyResult.data.excludedGlobalEquivalentDomains ?? [])
    user.updatedAt = options.clock.now().toISOString()
    const saveResult = identityUserSave(requestContext.data.database, user)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    return context.json({})
  }

  app.get("/api/sync", authenticate("sync"), sync)
  app.get("/api/settings/domains", authenticate("get_settings_domains"), getDomains)
  app.post("/api/settings/domains", authenticate("post_settings_domains"), updateDomains)
  app.put("/api/settings/domains", authenticate("put_settings_domains"), updateDomains)
}

function syncRequestContextResolve(
  context: Context<AuthenticationEnvironment>,
  options: SyncRouteOptions,
): Result<{ authentication: AuthenticationContext; database: NonNullable<SyncRouteOptions["database"]> }> {
  const authentication = authenticationContextGet(context)
  if (authentication === undefined)
    return apiErrorCreate("syncAuthentication", "platform.unauthorized", "Authentication is required.")
  const database = options.database ?? context.get("database")
  if (database === undefined) return apiErrorCreate("syncDatabase", "platform.internal", "Database unavailable.")
  return resultCreate({ authentication, database })
}

function syncCipherVisible(type: number, clientVersion: AuthenticationClientVersion | null): boolean {
  if (type !== 5) return true
  return clientVersion !== null && authenticationClientVersionCompare(clientVersion, sshKeyMinimumClientVersion) >= 0
}

function syncExcludeDomains(context: Context<AuthenticationEnvironment>): boolean {
  return context.req.query("excludeDomains") === "true"
}

function syncDomainsToJson(
  user: AuthenticationContext["user"],
  includeExcluded: boolean,
): { equivalentDomains: unknown[]; globalEquivalentDomains: unknown[]; object: "domains" } {
  const excludedGlobals = syncJsonNumberArrayParse(user.excludedGlobals)
  const globalEquivalentDomains = syncGlobalDomains
    .map((global) => ({ ...global, excluded: excludedGlobals.includes(global.type) }))
    .filter((global) => includeExcluded || !global.excluded)
  return {
    equivalentDomains: syncJsonArrayParse(user.equivalentDomains),
    globalEquivalentDomains,
    object: "domains",
  }
}

function syncJsonArrayParse(value: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function syncJsonNumberArrayParse(value: string): number[] {
  return syncJsonArrayParse(value).filter((item): item is number => typeof item === "number")
}

function syncUserDecryptionToJson(user: AuthenticationContext["user"]) {
  const masterPasswordUnlock =
    user.passwordHash.byteLength === 0
      ? null
      : {
          kdf: {
            kdfType: user.clientKdfType,
            iterations: user.clientKdfIter,
            memory: user.clientKdfMemory,
            parallelism: user.clientKdfParallelism,
          },
          masterKeyEncryptedUserKey: user.akey,
          masterKeyWrappedUserKey: user.akey,
          salt: user.email,
        }
  return { masterPasswordUnlock }
}
