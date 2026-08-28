type AdminOrganization = {
  uuid: string
  name: string
  billing_email: string
  private_key: string | null
  public_key: string | null
}

export function adminOrganizationJsonCreate(organization: AdminOrganization, mailEnabled = false) {
  return {
    id: organization.uuid,
    name: organization.name,
    seats: null,
    maxCollections: null,
    maxStorageGb: 32_767,
    use2fa: true,
    useCustomPermissions: true,
    useDirectory: false,
    useEvents: false,
    useGroups: false,
    useTotp: true,
    usePolicies: true,
    useScim: false,
    useSso: false,
    useKeyConnector: false,
    usePasswordManager: true,
    useSecretsManager: false,
    selfHost: true,
    useApi: true,
    useDisableSMAdsForUsers: true,
    useInviteLinks: false,
    useMyItems: false,
    useOrganizationDomains: false,
    usePam: false,
    usePhishingBlocker: false,
    hasPublicAndPrivateKeys: organization.private_key !== null && organization.public_key !== null,
    useResetPassword: mailEnabled,
    allowAdminAccessToAllCollectionItems: true,
    limitCollectionCreation: true,
    limitCollectionDeletion: true,
    limitItemDeletion: false,
    useActivateAutofillPolicy: false,
    useAdminSponsoredFamilies: false,
    useRiskInsights: false,
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
    billingEmail: organization.billing_email,
    planType: 6,
    usersGetPremium: true,
    object: "organization" as const,
  }
}
