import { classArr } from "#ui/utils/classArr.js"

/** Thin, subtly colored scrollbar styling for scroll owners. */
export const classesScrollbar = classArr(
  "[scrollbar-width:thin]", // slim native scrollbar
  "[scrollbar-color:var(--color-slate-300)_transparent]", // light thumb/track
  "dark:[scrollbar-color:var(--color-slate-700)_transparent]", // dark thumb/track
  "overscroll-contain", // keep scroll chaining inside the column
)
