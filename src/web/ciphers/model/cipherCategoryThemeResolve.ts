import type { CipherCategory } from "../schemas/cipherCategorySchema.js"
import type { CipherType } from "../schemas/cipherTypeSchema.js"
import { cipherTypeToCategory } from "./cipherTypeToCategory.js"

export function cipherCategoryThemeResolve(categoryOrType: CipherCategory | CipherType | string): {
  bg: string
  text: string
  border: string
  badgeVariant: "filledBlue" | "filledGreen" | "filledRed" | "subtle" | "outline"
} {
  const category = typeof categoryOrType === "number" ? cipherTypeToCategory(categoryOrType) : categoryOrType

  switch (category) {
    case "login":
    case "1":
      return {
        bg: "bg-blue-50 dark:bg-blue-950/60",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-800",
        badgeVariant: "filledBlue",
      }
    case "secureNote":
    case "2":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/60",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-800",
        badgeVariant: "subtle",
      }
    case "creditCard":
    case "card":
    case "3":
      return {
        bg: "bg-emerald-50 dark:bg-emerald-950/60",
        text: "text-emerald-600 dark:text-emerald-400",
        border: "border-emerald-200 dark:border-emerald-800",
        badgeVariant: "filledGreen",
      }
    case "identity":
    case "4":
      return {
        bg: "bg-purple-50 dark:bg-purple-950/60",
        text: "text-purple-600 dark:text-purple-400",
        border: "border-purple-200 dark:border-purple-800",
        badgeVariant: "subtle",
      }
    case "server":
      return {
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-700 dark:text-slate-300",
        border: "border-slate-200 dark:border-slate-700",
        badgeVariant: "outline",
      }
    case "sshKey":
    case "5":
      return {
        bg: "bg-teal-50 dark:bg-teal-950/60",
        text: "text-teal-600 dark:text-teal-400",
        border: "border-teal-200 dark:border-teal-800",
        badgeVariant: "subtle",
      }
    default:
      return {
        bg: "bg-slate-50 dark:bg-slate-900",
        text: "text-slate-600 dark:text-slate-400",
        border: "border-slate-200 dark:border-slate-800",
        badgeVariant: "outline",
      }
  }
}
