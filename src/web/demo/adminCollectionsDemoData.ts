import type { OrganizationCollectionAccess } from "../organizations/schemas/organizationCollectionAccessSchema.js"
import type { OrganizationCollection } from "../organizations/schemas/organizationCollectionSchema.js"

const adminCollectionAccessCreate = (
  id: string,
  name: string,
  permissions: Pick<OrganizationCollectionAccess, "hidePasswords" | "manage" | "readOnly">,
): OrganizationCollectionAccess => ({
  ...permissions,
  id,
  name,
})

const adminCollectionCreate = (
  organizationId: string,
  id: string,
  externalId: string,
  name: string,
  users: OrganizationCollectionAccess[] = [],
): OrganizationCollection => ({
  externalId,
  hidePasswords: false,
  id,
  manage: true,
  manageAll: false,
  name,
  organizationId,
  readOnly: false,
  users,
})

export const adminCollectionsDemoData = {
  "organization-acme-core": [
    adminCollectionCreate(
      "organization-acme-core",
      "collection-acme-core-001",
      "COL-CORE-ENG",
      "Engineering Infrastructure",
      [
        adminCollectionAccessCreate("user-alex-rivera", "Alex Rivera", {
          hidePasswords: false,
          manage: true,
          readOnly: false,
        }),
        adminCollectionAccessCreate("user-morgan-lee", "Morgan Lee", {
          hidePasswords: true,
          manage: false,
          readOnly: true,
        }),
      ],
    ),
    adminCollectionCreate("organization-acme-core", "collection-acme-core-002", "COL-CORE-FIN", "Finance & Banking", [
      adminCollectionAccessCreate("user-morgan-lee", "Morgan Lee", {
        hidePasswords: false,
        manage: true,
        readOnly: false,
      }),
    ]),
    adminCollectionCreate("organization-acme-core", "collection-acme-core-003", "COL-CORE-MKT", "Marketing & Social"),
    adminCollectionCreate(
      "organization-acme-core",
      "collection-acme-core-004",
      "COL-CORE-PROD",
      "Production Operations",
    ),
    adminCollectionCreate(
      "organization-acme-core",
      "collection-acme-core-005",
      "COL-CORE-SEC",
      "Security & Compliance",
    ),
    adminCollectionCreate("organization-acme-core", "collection-acme-core-006", "COL-CORE-SUPPORT", "Customer Support"),
    adminCollectionCreate("organization-acme-core", "collection-acme-core-007", "COL-CORE-HR", "Human Resources"),
    adminCollectionCreate("organization-acme-core", "collection-acme-core-008", "COL-CORE-VENDOR", "Vendor Access"),
    adminCollectionCreate("organization-acme-core", "collection-acme-core-009", "COL-CORE-SHARED", "Shared Services"),
  ],
  "organization-acme-design": [
    adminCollectionCreate(
      "organization-acme-design",
      "collection-acme-design-001",
      "COL-DESIGN-PRODUCT",
      "Product Design",
    ),
    adminCollectionCreate("organization-acme-design", "collection-acme-design-002", "COL-DESIGN-BRAND", "Brand Studio"),
    adminCollectionCreate(
      "organization-acme-design",
      "collection-acme-design-003",
      "COL-DESIGN-RESEARCH",
      "Research & UX",
    ),
    adminCollectionCreate(
      "organization-acme-design",
      "collection-acme-design-004",
      "COL-DESIGN-CLIENT",
      "Client Delivery",
    ),
  ],
  "organization-legacy-labs": [
    adminCollectionCreate(
      "organization-legacy-labs",
      "collection-legacy-labs-001",
      "COL-LEGACY-ARCHIVE",
      "Legacy Archive",
    ),
  ],
} satisfies Readonly<Record<string, readonly OrganizationCollection[]>>
