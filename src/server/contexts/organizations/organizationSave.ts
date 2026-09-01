import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { eq, inArray } from "drizzle-orm"
import { organizations } from "../../database/schema/organizations.js"
import { users } from "../../database/schema/users.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
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
    const userUuids = database.drizzle
      .select({ uuid: usersOrganizations.userUuid })
      .from(usersOrganizations)
      .where(eq(usersOrganizations.orgUuid, organization.uuid))
      .all()
      .map((row) => row.uuid)
    if (userUuids.length > 0)
      database.drizzle.update(users).set({ updatedAt: revisionDate }).where(inArray(users.uuid, userUuids)).run()
    database.drizzle
      .insert(organizations)
      .values({
        uuid: organization.uuid,
        identifier: organization.identifier,
        name: organization.name,
        billingEmail: organization.billingEmail,
        privateKey: organization.privateKey,
        publicKey: organization.publicKey,
      })
      .onConflictDoUpdate({
        target: organizations.uuid,
        set: {
          identifier: organization.identifier,
          name: organization.name,
          billingEmail: organization.billingEmail,
          privateKey: organization.privateKey,
          publicKey: organization.publicKey,
        },
      })
      .run()
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
