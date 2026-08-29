interface VaultCategoryTheme {
  bg: string
  text: string
}

const categoryThemes: Record<string, VaultCategoryTheme> = {
  login: { bg: "bg-blue-100 dark:bg-blue-950", text: "text-blue-800 dark:text-blue-200" },
  secureNote: { bg: "bg-amber-100 dark:bg-amber-950", text: "text-amber-800 dark:text-amber-200" },
  creditCard: { bg: "bg-emerald-100 dark:bg-emerald-950", text: "text-emerald-800 dark:text-emerald-200" },
  identity: { bg: "bg-purple-100 dark:bg-purple-950", text: "text-purple-800 dark:text-purple-200" },
  sshKey: { bg: "bg-teal-100 dark:bg-teal-950", text: "text-teal-800 dark:text-teal-200" },
}

const defaultCategoryTheme: VaultCategoryTheme = {
  bg: "bg-slate-100 dark:bg-slate-800",
  text: "text-slate-600 dark:text-slate-300",
}

export function vaultCategoryThemeResolve(category: string): VaultCategoryTheme {
  return { ...(categoryThemes[category] ?? defaultCategoryTheme) }
}
