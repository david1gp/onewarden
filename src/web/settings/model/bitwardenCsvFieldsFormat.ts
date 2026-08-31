type BitwardenCsvField = {
  name?: string | null
  value?: string | null
}

export function bitwardenCsvFieldsFormat(fields: ReadonlyArray<BitwardenCsvField>): string {
  return fields.map((field) => `${field.name ?? ""}: ${field.value ?? ""}`).join("\n")
}
