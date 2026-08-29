import { expect, test } from "bun:test"
import { vaultCategoryIconResolve } from "../../../src/web/demo/vaultCategoryIconResolve.js"
import { vaultCategoryLabelResolve } from "../../../src/web/demo/vaultCategoryLabelResolve.js"
import { vaultCategoryThemeResolve } from "../../../src/web/demo/vaultCategoryThemeResolve.js"
import { vaultCategoryTitleResolve } from "../../../src/web/demo/vaultCategoryTitleResolve.js"
import { vaultSvgIcons } from "../../../src/web/demo/vaultSvgIcons.js"

test("vault category icon mapping preserves known and fallback icons", () => {
  expect(vaultCategoryIconResolve("login")).toBe(vaultSvgIcons.login)
  expect(vaultCategoryIconResolve("secureNote")).toBe(vaultSvgIcons.secureNote)
  expect(vaultCategoryIconResolve("creditCard")).toBe(vaultSvgIcons.creditCard)
  expect(vaultCategoryIconResolve("identity")).toBe(vaultSvgIcons.identity)
  expect(vaultCategoryIconResolve("password")).toBe(vaultSvgIcons.password)
  expect(vaultCategoryIconResolve("sshKey")).toBe(vaultSvgIcons.sshKey)
  expect(vaultCategoryIconResolve("server")).toBe(vaultSvgIcons.login)
  expect(vaultCategoryIconResolve("unknown")).toBe(vaultSvgIcons.login)
  expect(vaultCategoryIconResolve(undefined)).toBe(vaultSvgIcons.login)
})

test("vault category label mapping preserves known and fallback labels", () => {
  expect(vaultCategoryLabelResolve("login")).toBe("Login")
  expect(vaultCategoryLabelResolve("secureNote")).toBe("Secure Note")
  expect(vaultCategoryLabelResolve("creditCard")).toBe("Credit Card")
  expect(vaultCategoryLabelResolve("identity")).toBe("Identity")
  expect(vaultCategoryLabelResolve("password")).toBe("Password")
  expect(vaultCategoryLabelResolve("sshKey")).toBe("SSH Key")
  expect(vaultCategoryLabelResolve("server")).toBe("Item")
  expect(vaultCategoryLabelResolve("unknown")).toBe("Item")
  expect(vaultCategoryLabelResolve(undefined)).toBe("Item")
})

test("vault category theme mapping preserves known and fallback themes", () => {
  expect(vaultCategoryThemeResolve("login")).toEqual({
    bg: "bg-blue-100 dark:bg-blue-950/60",
    text: "text-blue-600 dark:text-blue-400",
  })
  expect(vaultCategoryThemeResolve("secureNote")).toEqual({
    bg: "bg-amber-100 dark:bg-amber-950/60",
    text: "text-amber-600 dark:text-amber-400",
  })
  expect(vaultCategoryThemeResolve("creditCard")).toEqual({
    bg: "bg-emerald-100 dark:bg-emerald-950/60",
    text: "text-emerald-600 dark:text-emerald-400",
  })
  expect(vaultCategoryThemeResolve("identity")).toEqual({
    bg: "bg-purple-100 dark:bg-purple-950/60",
    text: "text-purple-600 dark:text-purple-400",
  })
  expect(vaultCategoryThemeResolve("sshKey")).toEqual({
    bg: "bg-teal-100 dark:bg-teal-950/60",
    text: "text-teal-600 dark:text-teal-400",
  })
  expect(vaultCategoryThemeResolve("server")).toEqual({
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-300",
  })
  expect(vaultCategoryThemeResolve("password")).toEqual({
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-300",
  })
  expect(vaultCategoryThemeResolve("unknown")).toEqual({
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-300",
  })
})

test("vault category title mapping preserves list titles and all fallback behavior", () => {
  expect(vaultCategoryTitleResolve("login")).toBe("Logins")
  expect(vaultCategoryTitleResolve("secureNote")).toBe("Secure Notes")
  expect(vaultCategoryTitleResolve("creditCard")).toBe("Credit Cards")
  expect(vaultCategoryTitleResolve("identity")).toBe("Identities")
  expect(vaultCategoryTitleResolve("sshKey")).toBe("SSH Keys")
  expect(vaultCategoryTitleResolve("server")).toBe("All Items")
  expect(vaultCategoryTitleResolve("password")).toBe("All Items")
  expect(vaultCategoryTitleResolve("all")).toBe("All Items")
})
