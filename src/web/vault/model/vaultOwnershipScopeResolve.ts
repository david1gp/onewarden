export function vaultOwnershipScopeResolve(value: string): "personal" | "organization" | null {
  switch (value.trim().toLowerCase()) {
    case "personal":
    case "personal vault":
    case "my vault":
    case "my-vault":
      return "personal"
    case "organization":
    case "organization-acme":
    case "acme corporation":
    case "acme corporation (organization)":
    case "work":
    case "shared":
      return "organization"
    default:
      return null
  }
}
