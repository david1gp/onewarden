export function organizationPolicyDescriptionResolve(type: number): string {
  switch (type) {
    case 0:
      return "Require all organization members to configure two-step login."
    case 1:
      return "Set minimum master password strength, character complexity, and score requirements."
    case 2:
      return "Configure generator defaults for password length and character combinations."
    case 3:
      return "Prevent members from joining any other organizations."
    case 5:
      return "Prevent members from creating and owning personal vault items."
    case 6:
      return "Completely disable creating and sharing Sends for all organization members."
    case 7:
      return "Enforce maximum Send expiration and auto-deletion rules."
    case 8:
      return "Allow organization administrators to safely reset passwords for enrolled users."
    case 14:
      return "Disallow unlocking vaults using a secondary PIN code."
    case 15:
      return "Prevent users from storing specific types of vault items."
    case 16:
      return "Specify default URI matching logic for browser extension autofill."
    default:
      return "Configure organization security policy rules and requirements."
  }
}
