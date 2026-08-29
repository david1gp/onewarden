import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Organization } from "./organization.js"

export function organizationSave(
  database: DatabaseConnection,
  organization: Organization,
  revisionDate: string,
): Result<void> {
  const op = "organizationSave"
  if (!organizationBillingEmailIsValid(organization.billingEmail))
    return resultErrorCreate(op, `BillingEmail ${organization.billingEmail} is not a valid email address`, {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  try {
    database.run(
      `UPDATE users
       SET updated_at = ?
       WHERE uuid IN (SELECT user_uuid FROM users_organizations WHERE org_uuid = ?)`,
      [revisionDate, organization.uuid],
    )
    database.run(
      `INSERT INTO organizations (uuid, identifier, name, billing_email, private_key, public_key)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
         identifier = excluded.identifier,
         name = excluded.name,
         billing_email = excluded.billing_email,
         private_key = excluded.private_key,
         public_key = excluded.public_key`,
      [
        organization.uuid,
        organization.identifier,
        organization.name,
        organization.billingEmail,
        organization.privateKey,
        organization.publicKey,
      ],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Organization save failed.")
  }
}

function organizationBillingEmailIsValid(email: string): boolean {
  const separator = email.lastIndexOf("@")
  if (separator < 1 || separator !== email.indexOf("@") || separator === email.length - 1 || /[\s]/u.test(email))
    return false
  const domain = email.slice(separator + 1)
  try {
    const domainUrl = new URL(`https://${domain}`)
    return domainUrl.pathname === "/" && domainUrl.search === "" && domainUrl.hostname.length > 0
  } catch {
    return false
  }
}
