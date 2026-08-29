import type { Organization } from "./organization.js"
import type { OrganizationRow } from "./organizationRow.js"

export function organizationFromRow(row: OrganizationRow): Organization {
  return {
    billingEmail: row.billing_email,
    name: row.name,
    privateKey: row.private_key,
    publicKey: row.public_key,
    uuid: row.uuid,
  }
}
