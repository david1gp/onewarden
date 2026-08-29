import type { Organization } from "./organization.js"

type OrganizationJsonOptions = {
  eventsEnabled?: boolean
  groupsEnabled?: boolean
  mailEnabled?: boolean
}

export function organizationToJson(
  organization: Organization,
  options: OrganizationJsonOptions = {},
): Record<string, unknown> {
  return {
    id: organization.uuid,
    identifier: organization.identifier,
    name: organization.name,
    seats: null,
    maxCollections: null,
    maxStorageGb: 32_767,
    use2fa: true,
    useCustomPermissions: true,
    useDirectory: false,
    useEvents: options.eventsEnabled ?? false,
    useGroups: options.groupsEnabled ?? false,
    useTotp: true,
    usePolicies: true,
    useScim: false,
    useSso: true,
    useKeyConnector: false,
    usePasswordManager: true,
    useSecretsManager: false,
    selfHost: true,
    useApi: true,
    useDisableSMAdsForUsers: true,
    useInviteLinks: false,
    useMyItems: false,
    useOrganizationDomains: true,
    usePam: false,
    usePhishingBlocker: false,
    hasPublicAndPrivateKeys: organization.privateKey !== null && organization.publicKey !== null,
    useResetPassword: options.mailEnabled ?? false,
    allowAdminAccessToAllCollectionItems: true,
    limitCollectionCreation: true,
    limitCollectionDeletion: true,
    limitItemDeletion: false,
    businessName: organization.name,
    businessAddress1: null,
    businessAddress2: null,
    businessAddress3: null,
    businessCountry: null,
    businessTaxNumber: null,
    maxAutoscaleSeats: null,
    maxAutoscaleSmSeats: null,
    maxAutoscaleSmServiceAccounts: null,
    secretsManagerPlan: null,
    smSeats: null,
    smServiceAccounts: null,
    billingEmail: organization.billingEmail,
    planType: 6,
    usersGetPremium: true,
    object: "organization",
  }
}
