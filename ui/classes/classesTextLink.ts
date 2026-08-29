import { classArr } from "#ui/utils/classArr.js"

export const classesTextLink = classArr(
  "text-blue-600 hover:text-blue-800", // light
  "dark:text-blue-400 dark:hover:text-blue-300", // dark
  "underline underline-offset-2 hover:decoration-2", // distinction
  "transition-colors", // animation
)

export const classesTextLinkGroupHover = classArr(
  "group-hover:text-blue-800", // light
  "dark:group-hover:text-blue-300", // dark
  "transition-colors", // animation
)
