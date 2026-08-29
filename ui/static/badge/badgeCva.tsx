import { classArr } from "#ui/utils/classArr.js"
import { classMerge } from "#ui/utils/classMerge.js"

export type BadgeVariant = keyof typeof badgeVariant

export const badgeVariant = {
  // transparent bg
  subtle: "subtle",
  outline: "outline",
  // colors 1
  contrast: "contrast",
  // colors 2
  filledGreen: "filledGreen",
  filledYellow: "filledYellow",
  filledBlue: "filledBlue",
  filledRed: "filledRed",
} as const

const baseClasses = classArr(
  "inline-flex items-center", // layout
  "text-sm", // text
  "px-2.5 py-0.5 border rounded-full", // padding
  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", // focus ring
)

const variantClasses = {
  subtle: "bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600",
  outline: "text-slate-900 border-slate-300 dark:text-slate-100 dark:border-slate-700",
  contrast: "bg-slate-900 border-slate-900 text-white dark:bg-slate-50 dark:text-slate-900 dark:border-slate-50",
  filledGreen: "bg-green-700 text-white border-green-700 dark:bg-green-700 dark:border-green-700",
  filledYellow: "bg-yellow-500 text-slate-900 border-yellow-500 dark:bg-yellow-600 dark:text-slate-900 dark:border-yellow-600",
  filledBlue: "bg-sky-700 text-white border-sky-700 dark:bg-sky-700 dark:border-sky-700",
  filledRed: "bg-red-700 text-white border-red-700 dark:bg-red-700 dark:border-red-700",
} as const satisfies Record<BadgeVariant, string>

const defaultVariant = badgeVariant.outline

export function badgeCva1(
  variant: BadgeVariant | null = defaultVariant,
  ...customClasses: (string | boolean | undefined | null | 0)[]
) {
  return classMerge(baseClasses, variantClasses[variant ?? defaultVariant], customClasses)
}
