export function organizationPolicyNameResolve(type: number): string {
  switch (type) {
    case 0:
      return "Two-Step Login"
    case 1:
      return "Master Password Requirements"
    case 2:
      return "Password Generator"
    case 3:
      return "Single Organization"
    case 5:
      return "Personal Ownership"
    case 6:
      return "Disable Send"
    case 7:
      return "Send Options"
    case 8:
      return "Reset Password"
    case 14:
      return "Remove Unlock with PIN"
    case 15:
      return "Restricted Item Types"
    case 16:
      return "URI Match Defaults"
    default:
      return `Policy #${type}`
  }
}
