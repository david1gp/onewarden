import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { BitwardenCsvRecord } from "./bitwardenCsvFormat.js"

const bitwardenCsvHeader = [
  "folder",
  "favorite",
  "type",
  "name",
  "notes",
  "fields",
  "reprompt",
  "login_uri",
  "login_username",
  "login_password",
  "login_totp",
]

function csvRowsParse(text: string): Result<string[][]> {
  const op = "bitwardenCsvParse"
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ""
  let state: "field-start" | "unquoted" | "quoted" | "after-quote" = "field-start"

  const invalid = (message: string): Result<string[][]> =>
    resultErrorCreate(op, message, { code: "platform.invalid-request", statusCode: 400 })

  for (let index = 0; index < text.length; ) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (state === "quoted") {
      if (char === '"' && nextChar === '"') {
        currentField += '"'
        index += 2
        continue
      }
      if (char === '"') {
        state = "after-quote"
        index++
        continue
      }
      currentField += char
      index++
      continue
    }

    if (state === "after-quote") {
      if (char === ",") {
        currentRow.push(currentField)
        currentField = ""
        state = "field-start"
        index++
        continue
      }
      if (char === "\n" || (char === "\r" && nextChar === "\n")) {
        currentRow.push(currentField)
        rows.push(currentRow)
        currentRow = []
        currentField = ""
        state = "field-start"
        index += char === "\r" ? 2 : 1
        continue
      }
      return invalid("Invalid CSV: unexpected character after a quoted field.")
    }

    if (state === "field-start" && char === '"') {
      state = "quoted"
      index++
      continue
    }
    if (char === ",") {
      currentRow.push(currentField)
      currentField = ""
      state = "field-start"
      index++
      continue
    }
    if (char === "\n" || (char === "\r" && nextChar === "\n")) {
      currentRow.push(currentField)
      rows.push(currentRow)
      currentRow = []
      currentField = ""
      state = "field-start"
      index += char === "\r" ? 2 : 1
      continue
    }
    if (char === "\r") return invalid("Invalid CSV: records must use CRLF or LF line endings.")
    if (char === '"') return invalid("Invalid CSV: quotes must start a quoted field.")

    currentField += char
    state = "unquoted"
    index++
  }

  if (state === "quoted") return invalid("Invalid CSV: unterminated quoted field.")
  if (currentRow.length > 0 || currentField.length > 0 || state !== "field-start") {
    currentRow.push(currentField)
    rows.push(currentRow)
  }
  return resultCreate(rows)
}

export function bitwardenCsvParse(csvText: string): Result<BitwardenCsvRecord[]> {
  const op = "bitwardenCsvParse"
  if (typeof csvText !== "string") {
    return resultErrorCreate(op, "Invalid CSV: content must be text.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  const text = csvText.startsWith("\uFEFF") ? csvText.slice(1) : csvText
  if (text.length === 0) {
    return resultErrorCreate(op, "Invalid CSV: missing header row.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const rowsResult = csvRowsParse(text)
  if (!rowsResult.success) return rowsResult
  const header = rowsResult.data[0]
  if (header === undefined || header.length !== bitwardenCsvHeader.length) {
    return resultErrorCreate(op, "Invalid CSV: missing or invalid header row.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  if (header.some((column, index) => column !== bitwardenCsvHeader[index])) {
    return resultErrorCreate(op, "Invalid CSV: expected the documented Bitwarden CSV header.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const records: BitwardenCsvRecord[] = []
  for (let index = 1; index < rowsResult.data.length; index++) {
    const row = rowsResult.data[index]
    if (row === undefined || row.length !== bitwardenCsvHeader.length) {
      return resultErrorCreate(op, `Invalid CSV: row ${index + 1} has the wrong number of columns.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }

    const [folder, favorite, type, name, notes, fields, reprompt, loginUri, loginUsername, loginPassword, loginTotp] =
      row
    if (type !== "login" && type !== "note") {
      return resultErrorCreate(op, `Invalid CSV: unsupported Bitwarden record type '${type}'.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    if (name === undefined || name.length === 0) {
      return resultErrorCreate(op, `Invalid CSV: row ${index + 1} must have a name.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    if (favorite !== "0" && favorite !== "1") {
      return resultErrorCreate(op, `Invalid CSV: row ${index + 1} has an invalid favorite value.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    if (reprompt !== "0" && reprompt !== "1") {
      return resultErrorCreate(op, `Invalid CSV: row ${index + 1} has an invalid reprompt value.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    if (type === "note" && [loginUri, loginUsername, loginPassword, loginTotp].some((value) => value !== "")) {
      return resultErrorCreate(op, `Invalid CSV: note row ${index + 1} contains login data.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }

    records.push({
      folder: folder === "" ? null : folder,
      favorite: favorite === "1",
      type,
      name,
      notes: notes === "" ? null : notes,
      fields: fields === "" ? null : fields,
      reprompt: reprompt === "1" ? 1 : 0,
      login_uri: loginUri === "" ? null : loginUri,
      login_username: loginUsername === "" ? null : loginUsername,
      login_password: loginPassword === "" ? null : loginPassword,
      login_totp: loginTotp === "" ? null : loginTotp,
    })
  }

  return resultCreate(records)
}
