export interface BitwardenCsvRecord {
  folder?: string | null
  favorite?: boolean | null
  type: string
  name: string
  notes?: string | null
  fields?: string | null
  reprompt?: number | null
  login_uri?: string | null
  login_username?: string | null
  login_password?: string | null
  login_totp?: string | null
}

function csvFieldEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replaceAll('"', '""')}"`
  }
  return str
}

export function bitwardenCsvFormat(records: BitwardenCsvRecord[]): string {
  const header = "folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp"
  const lines = [header]

  for (const record of records) {
    const row = [
      csvFieldEscape(record.folder),
      csvFieldEscape(record.favorite ? "1" : ""),
      csvFieldEscape(record.type),
      csvFieldEscape(record.name),
      csvFieldEscape(record.notes),
      csvFieldEscape(record.fields),
      csvFieldEscape(record.reprompt ?? 0),
      csvFieldEscape(record.login_uri),
      csvFieldEscape(record.login_username),
      csvFieldEscape(record.login_password),
      csvFieldEscape(record.login_totp),
    ]
    lines.push(row.join(","))
  }

  return lines.join("\n")
}
