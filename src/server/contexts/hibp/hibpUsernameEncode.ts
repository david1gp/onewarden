export function hibpUsernameEncode(username: string): string {
  return new URLSearchParams({ username }).toString().slice("username=".length)
}
