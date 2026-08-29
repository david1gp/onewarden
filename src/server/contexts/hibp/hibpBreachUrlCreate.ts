import { hibpUsernameEncode } from "./hibpUsernameEncode.js"

export function hibpBreachUrlCreate(username: string): string {
  const encodedUsername = hibpUsernameEncode(username)
  return `https://haveibeenpwned.com/api/v3/breachedaccount/${encodedUsername}?truncateResponse=false&includeUnverified=false`
}
