type CaptureControls = {
  fields: ReadonlyMap<string, HTMLElement>
  fieldKinds: ReadonlyMap<string, string>
  fieldFormIds: ReadonlyMap<string, string>
  formId: string
}

/** Reads one bounded login credential snapshot for immediate validated port transfer. */
export function extensionCredentialCaptureRead(
  controls: CaptureControls,
): { username: string | null; password: string } | null {
  let username: string | null = null
  let currentPassword: string | null = null
  let newPassword: string | null = null
  for (const [fieldId, control] of controls.fields) {
    if (controls.fieldFormIds.get(fieldId) !== controls.formId) continue
    const kind = controls.fieldKinds.get(fieldId)
    const value = controlValueRead(control)
    if (value === null) continue
    if (kind === "username" && username === null) username = value.slice(0, 320)
    if (kind === "currentPassword" && currentPassword === null) currentPassword = value
    if (kind === "newPassword" && newPassword === null) newPassword = value
  }
  const password = (newPassword ?? currentPassword)?.slice(0, 4_096) ?? ""
  if (password.length === 0) return null
  return { username, password }
}

function controlValueRead(control: HTMLElement): string | null {
  if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) return control.value
  if (control.isContentEditable) return control.textContent ?? ""
  return null
}
