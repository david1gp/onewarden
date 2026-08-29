const categoryTitles: Record<string, string> = {
  login: "Logins",
  secureNote: "Secure Notes",
  creditCard: "Credit Cards",
  identity: "Identities",
  server: "Servers",
  sshKey: "SSH Keys",
}

export function vaultCategoryTitleResolve(category: string): string {
  return categoryTitles[category] ?? "All Items"
}
