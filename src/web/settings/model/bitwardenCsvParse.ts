import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { BitwardenCsvRecord } from "./bitwardenCsvFormat.js"

export function bitwardenCsvParse(csvText: string): Result<BitwardenCsvRecord[]> {
  const op = "bitwardenCsvParse"
  const text = csvText.trim()
  if (text.length === 0) {
    return resultCreate([])
  }

  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ""
  let inQuotes = false
  let index = 0

  while (index < text.length) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"'
        index += 2
        continue
      }
      if (char === '"') {
        inQuotes = false
        index++
        continue
      }
      currentField += char
      index++
      continue
    }

    if (char === '"') {
      inQuotes = true
      index++
      continue
    }
    if (char === ",") {
      currentRow.push(currentField)
      currentField = ""
      index++
      continue
    }
    if (char === "\r") {
      index++
      continue
    }
    if (char === "\n") {
      currentRow.push(currentField)
      currentField = ""
      rows.push(currentRow)
      currentRow = []
      index++
      continue
    }

    currentField += char
    index++
  }

  currentRow.push(currentField)
  rows.push(currentRow)

  if (rows.length <= 1) {
    return resultCreate([])
  }

  const header = rows[0]
  if (header === undefined) {
    return resultErrorCreate(op, "Invalid CSV: missing header row.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const headerIndices = new Map<string, number>()
  for (let i = 0; i < header.length; i++) {
    const col = header[i]?.trim().toLowerCase()
    if (col) headerIndices.set(col, i)
  }

  const records: BitwardenCsvRecord[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || (row.length === 1 && row[0]?.trim() === "")) continue

    const getField = (name: string): string => {
      const idx = headerIndices.get(name)
      if (idx === undefined) return ""
      return row[idx]?.trim() ?? ""
    }

    const typeStr = getField("type") || "login"
    const name = getField("name")
    if (!name) continue

    const favoriteVal = getField("favorite")

    records.push({
      folder: getField("folder") || null,
      favorite: favoriteVal === "1" || favoriteVal.toLowerCase() === "true",
      type: typeStr,
      name,
      notes: getField("notes") || null,
      fields: getField("fields") || null,
      reprompt: Number.parseInt(getField("reprompt") || "0", 10) || 0,
      login_uri: getField("login_uri") || null,
      login_username: getField("login_username") || null,
      login_password: getField("login_password") || null,
      login_totp: getField("login_totp") || null,
    })
  }

  return resultCreate(records)
}
