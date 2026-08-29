import { classesButtonClickAnimation } from "#ui/interactive/button/classesButtonClickAnimation.js"
import { classesButtonDisabled } from "#ui/interactive/button/classesButtonDisabled.js"
import { classArr } from "#ui/utils/classArr.js"
import { classMerge } from "#ui/utils/classMerge.js"

export type ButtonVariant = keyof typeof buttonVariant
export const buttonVariant = {
  none: "none",
  // transparent bg
  outline: "outline",
  ghost: "ghost",
  link: "link",
  // filled black/white/gray
  filled: "filled",
  subtle: "subtle",
  contrast: "contrast",
  // filled colors
  filledYellow: "filledYellow",
  filledAmber: "filledAmber",
  filledOrange: "filledOrange",
  filledRed: "filledRed",
  filledGreen: "filledGreen",
  filledSky: "filledSky",
  filledBlue: "filledBlue",
  filledIndigo: "filledIndigo",
  // filled gradient colors
  filledGreenGradient: "filledGreenGradient",
  filledYellowGradient: "filledYellowGradient",
  filledAmberGradient: "filledAmberGradient",
  filledOrangeGradient: "filledOrangeGradient",
  filledRedGradient: "filledRedGradient",
  filledSkyGradient: "filledSkyGradient",
  filledBlueGradient: "filledBlueGradient",
  filledBlueGreenGradient: "filledBlueGreenGradient",
  filledIndigoGradient: "filledIndigoGradient",
  // outlined colors
  outlineRed: "outlineRed",
} as const

export type ButtonSize = keyof typeof buttonSize
export const buttonSize = {
  none: "none",
  minimal: "minimal",
  sm: "sm",
  default: "default",
  lg: "lg",
} as const

export type ButtonCvaProps = {
  variant?: ButtonVariant
  size?: ButtonSize
}

const baseClasses = classArr(
  "inline-flex", // layout
  "font-medium", // text
  "items-center justify-center", // layout children
  "rounded-md ring-offset-background", // rounded, rings
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", // focus
  "transition-colors", // animation
  "group",
  "cursor-pointer",
)

const variantClasses = {
  //
  // transparent bg
  //
  none: "",
  outline: classArr(
    "bg-transparent dark:bg-transparent",
    "dark:text-slate-100", // text
    "hover:bg-slate-100", // bg hover
    "border border-slate-200 dark:border-slate-700 dark:hover:bg-slate-900", // border
  ),
  ghost: classArr(
    "dark:text-slate-100 dark:hover:text-slate-100", // text
    "bg-transparent dark:bg-transparent", // bg
    "data-[state=open]:bg-transparent dark:data-[state=open]:bg-transparent", // bg data
    "hover:bg-slate-100 dark:hover:bg-slate-800", // bg hover
  ),
  link: classArr(
    "text-slate-900 dark:text-slate-100", // text
    "underline-offset-4 hover:underline ", // underline
    "bg-transparent dark:bg-transparent", // bg
    "hover:bg-transparent dark:hover:bg-transparent", // bg hover
  ),
  //
  // filled grayscale
  //
  filled: classArr(
    "dark:text-slate-100", // text
    "bg-white dark:bg-black", // bg
    "hover:bg-slate-50 dark:hover:bg-slate-900", // bg hover
  ),
  subtle: classArr(
    "text-slate-900 dark:text-slate-100", // text
    "bg-slate-100 dark:bg-slate-700", // bg
    "hover:bg-slate-200 dark:hover:bg-slate-600", // bg hover
  ),
  contrast: classArr(
    "text-white dark:text-slate-900 dark:hover:text-slate-900", // text
    "bg-slate-900 dark:bg-slate-50", // bg
    "hover:bg-slate-700 dark:hover:bg-slate-300", // bg hover
  ),
  //
  // filled colors
  //
  filledYellow: classArr(
    "text-slate-900", // text
    "bg-yellow-500 dark:bg-yellow-600 ", // bg
    "hover:bg-yellow-600 dark:hover:bg-yellow-500", // bg hover
    "focus:ring-yellow-400 dark:focus:ring-yellow-400", // focus
  ),
  filledAmber: classArr(
    "text-white", // text
    "bg-amber-700 dark:bg-amber-700 ", // bg
    "hover:bg-amber-800 dark:hover:bg-amber-600", // bg hover
    "focus:ring-amber-400 dark:focus:ring-amber-400", // focus
  ),
  filledOrange: classArr(
    "text-white", // text
    "bg-orange-600 dark:bg-orange-600 ", // bg
    "hover:bg-orange-700 dark:hover:bg-orange-500", // bg hover
    "focus:ring-orange-400 dark:focus:ring-orange-400", // focus
  ),
  filledRed: classArr(
    "text-white", // text
    "bg-red-600 dark:bg-red-600", // bg
    "hover:bg-red-700 dark:hover:bg-red-500", // bg hover
    "focus:ring-red-400 dark:focus:ring-red-400", // focus
  ),
  filledGreen: classArr(
    "text-white", // text
    "bg-green-700 hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-600", // bg
    "focus:ring-green-400 dark:focus:ring-green-400", // focus
  ),
  filledSky: classArr(
    "text-white", // text
    "bg-sky-700 hover:bg-sky-800 dark:bg-sky-700 dark:hover:bg-sky-600", // bg
    "focus:ring-sky-400 dark:focus:ring-sky-400", // focus
  ),
  filledIndigo: classArr(
    "text-white", // text
    "bg-indigo-600 dark:bg-indigo-600 ", // bg
    "hover:bg-indigo-700 dark:hover:bg-indigo-500", // bg hover
    "focus:ring-indigo-400 dark:focus:ring-indigo-400", // focus
  ),
  filledBlue: classArr(
    "text-white", // text
    "bg-blue-600 dark:bg-blue-600 ", // bg
    "hover:bg-blue-700 dark:hover:bg-blue-500", // bg hover
    "focus:ring-blue-400 dark:focus:ring-blue-400", // focus
  ),
  //
  // filled gradient colors
  // fancy CTA gradients: two-tone fill, colored shadow, hover deepen
  //
  filledGreenGradient: classArr(
    "text-white", // text
    "bg-gradient-to-r from-green-700 to-emerald-800", // gradient bg
    "hover:from-green-800 hover:to-emerald-900", // bg hover
    "shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all", // shadow
    "focus:ring-emerald-400 dark:focus:ring-emerald-400", // focus
  ),
  filledYellowGradient: classArr(
    "text-slate-900", // text
    "bg-gradient-to-r from-yellow-400 to-yellow-600", // gradient bg (pure yellow)
    "hover:from-yellow-500 hover:to-yellow-700", // bg hover
    "shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 transition-all", // shadow
    "focus:ring-yellow-400 dark:focus:ring-yellow-400", // focus
  ),
  filledAmberGradient: classArr(
    "text-white", // text
    "bg-gradient-to-r from-amber-700 to-amber-900", // gradient bg (pure amber)
    "hover:from-amber-800 hover:to-amber-950", // bg hover
    "shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all", // shadow
    "focus:ring-amber-400 dark:focus:ring-amber-400", // focus
  ),
  filledOrangeGradient: classArr(
    "text-white", // text
    "bg-gradient-to-r from-orange-600 to-orange-800", // gradient bg (pure orange)
    "hover:from-orange-700 hover:to-orange-900", // bg hover
    "shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all", // shadow
    "focus:ring-orange-400 dark:focus:ring-orange-400", // focus
  ),
  filledRedGradient: classArr(
    "text-white", // text
    "bg-gradient-to-r from-red-600 to-red-800", // gradient bg (pure red)
    "hover:from-red-700 hover:to-red-900", // bg hover
    "shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all", // shadow
    "focus:ring-red-400 dark:focus:ring-red-400", // focus
  ),
  filledSkyGradient: classArr(
    "text-white", // text
    "bg-gradient-to-r from-sky-700 to-sky-900", // gradient bg (pure sky)
    "hover:from-sky-800 hover:to-sky-950", // bg hover
    "shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all", // shadow
    "focus:ring-sky-400 dark:focus:ring-sky-400", // focus
  ),
  filledBlueGradient: classArr(
    "text-white", // text
    "bg-gradient-to-r from-blue-600 to-blue-800", // gradient bg (pure blue)
    "hover:from-blue-700 hover:to-blue-900", // bg hover
    "shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all", // shadow
    "focus:ring-blue-400 dark:focus:ring-blue-400", // focus
  ),
  filledBlueGreenGradient: classArr(
    "text-white", // text
    "bg-gradient-to-r from-blue-700 to-emerald-700", // gradient bg
    "hover:from-blue-800 hover:to-emerald-800", // bg hover
    "shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all", // shadow
    "focus:ring-blue-400 dark:focus:ring-blue-400", // focus
  ),
  filledIndigoGradient: classArr(
    "text-white", // text
    "bg-gradient-to-r from-indigo-600 to-indigo-800", // gradient bg (pure indigo)
    "hover:from-indigo-700 hover:to-indigo-900", // bg hover
    "shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all", // shadow
    "focus:ring-indigo-400 dark:focus:ring-indigo-400", // focus
  ),
  //
  // outline toast colors
  //
  outlineRed: classArr(
    "text-red-500 dark:text-red-500", // text
    "border border-red-200 dark:border-red-700", // border
    "bg-transparent", // bg
    "hover:bg-red-100 dark:hover:bg-red-950", // bg hover
    "focus:ring-red-400 dark:focus:ring-red-400", // focus
  ),
} as const satisfies Record<ButtonVariant, string>

const sizeClasses = {
  none: "",
  minimal: "rounded-none",
  sm: "px-3",
  default: "py-2 px-3",
  lg: "px-8 py-4 text-lg",
} as const satisfies Record<ButtonSize, string>

const defaultSize = buttonSize.default

export function buttonCva1(variant: ButtonVariant, ...customClasses: (string | boolean | undefined | null | 0)[]) {
  return buttonCva2(variant, null, ...customClasses)
}

export function buttonCva2(
  variant: ButtonVariant = buttonVariant.ghost,
  size: ButtonSize | null = defaultSize,
  ...customClasses: (string | boolean | undefined | null | 0)[]
) {
  const v = variant
  const s = size ?? defaultSize
  return classMerge(baseClasses, variantClasses[v], sizeClasses[s], combinedClasses(v, s), customClasses)
}

function combinedClasses(variant: ButtonVariant, size: ButtonSize) {
  const variantGroup1 =
    variant === buttonVariant.outline || variant === buttonVariant.filledYellow || variant === buttonVariant.outlineRed
  if (variantGroup1 && size === buttonSize.lg) {
    return "border-2"
  }
  return null
}

export function buttonCvaIconOnly(
  variant: ButtonVariant = buttonVariant.ghost,
  isLoading: boolean | undefined,
  isDisabled: boolean | undefined,
  ...customClasses: (string | boolean | undefined | null | 0)[]
) {
  const classes = buttonCva2(
    variant,
    buttonSize.none,
    classesButtonClickAnimation,
    "rounded-full p-2.5",
    (isDisabled || isLoading) && classesButtonDisabled,
    ...customClasses,
  )
  return classes
}
