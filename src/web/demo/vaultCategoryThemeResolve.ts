interface VaultCategoryTheme {
  bg: string
  text: string
}

const categoryThemes: Record<string, VaultCategoryTheme> = {
  login: { bg: "bg-blue-100 dark:bg-blue-950/60", text: "text-blue-600 dark:text-blue-400" },
  secureNote: { bg: "bg-amber-100 dark:bg-amber-950/60", text: "text-amber-600 dark:text-amber-400" },
  creditCard: { bg: "bg-emerald-100 dark:bg-emerald-950/60", text: "text-emerald-600 dark:text-emerald-400" },
  identity: { bg: "bg-purple-100 dark:bg-purple-950/60", text: "text-purple-600 dark:text-purple-400" },
  server: { bg: "bg-slate-200 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300" },
  sshKey: { bg: "bg-teal-100 dark:bg-teal-950/60", text: "text-teal-600 dark:text-teal-400" },
}

const defaultCategoryTheme: VaultCategoryTheme = {
  bg: "bg-slate-100 dark:bg-slate-800",
  text: "text-slate-600 dark:text-slate-300",
}

export function vaultCategoryThemeResolve(category: string): VaultCategoryTheme {
  return { ...(categoryThemes[category] ?? defaultCategoryTheme) }
}
