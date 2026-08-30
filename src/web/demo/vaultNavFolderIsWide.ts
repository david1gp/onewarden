/** Maximum folder label length that still fits inside a single sidebar grid column. */
const vaultNavFolderColumnLabelLimit = 12

/**
 * Decides whether a folder entry has to span both sidebar grid columns.
 * Labels longer than a single column can hold are rendered full width so they
 * stay readable while still truncating instead of widening the sidebar.
 */
export function vaultNavFolderIsWide(folder: string): boolean {
  return folder.trim().length > vaultNavFolderColumnLabelLimit
}
