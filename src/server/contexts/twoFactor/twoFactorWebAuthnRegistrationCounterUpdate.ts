import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { TwoFactorWebAuthnAuthentication } from "./twoFactorWebAuthnAuthentication.js"
import { twoFactorProviderType } from "./twoFactorProviderType.js"
import { twoFactorRecordFindByUserAndType } from "./twoFactorRecordFindByUserAndType.js"
import { twoFactorRecordSave } from "./twoFactorRecordSave.js"
import { twoFactorWebAuthnRegistrationsRead } from "./twoFactorWebAuthnRegistrationsRead.js"

export function twoFactorWebAuthnRegistrationCounterUpdate(
  database: DatabaseConnection,
  userUuid: string,
  authentication: TwoFactorWebAuthnAuthentication,
): Result<void> {
  return databaseTransaction(database, () => {
    const recordResult = twoFactorRecordFindByUserAndType(database, userUuid, twoFactorProviderType.webauthn)
    if (!recordResult.success) return recordResult
    if (recordResult.data === null)
      return resultErrorCreate("twoFactorWebAuthnRegistrationCounterUpdate", "Webauthn data not found")
    const registrationsResult = twoFactorWebAuthnRegistrationsRead(recordResult.data.data)
    if (!registrationsResult.success) return registrationsResult
    const registrations = registrationsResult.data
    const registration = registrations.find((item) => item.credentialId === authentication.credentialId)
    if (registration === undefined)
      return resultErrorCreate("twoFactorWebAuthnRegistrationCounterUpdate", "Credential not present")
    const credential = registration.credential ?? { id: registration.credentialId }
    if (
      credential.counter !== undefined &&
      (credential.counter > 0 || authentication.newCounter > 0) &&
      authentication.newCounter <= credential.counter
    )
      return resultErrorCreate("twoFactorWebAuthnRegistrationCounterUpdate", "Webauthn credential counter was replayed")
    if (credential.counter === undefined || authentication.newCounter > credential.counter) {
      registration.credential = { ...credential, counter: authentication.newCounter }
      recordResult.data.data = JSON.stringify(registrations)
      return twoFactorRecordSave(database, recordResult.data)
    }
    return resultCreate(undefined)
  })
}
