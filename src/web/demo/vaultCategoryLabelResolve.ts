const categoryLabels: Record<string, string> = {
  login: "Login",
  secureNote: "Secure Note",
  creditCard: "Credit Card",
  identity: "Identity",
  password: "Password",
  server: "Server",
  sshKey: "SSH Key",
}

export function vaultCategoryLabelResolve(category: string | undefined): string {
  return categoryLabels[category ?? ""] ?? "Item"
}
