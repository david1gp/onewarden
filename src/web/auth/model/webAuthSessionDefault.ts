import { webAuthSessionCreate } from "./webAuthSessionCreate.js"

let defaultSession: ReturnType<typeof webAuthSessionCreate> | null = null

export function webAuthSessionDefault() {
  if (defaultSession === null) {
    defaultSession = webAuthSessionCreate()
  }
  return defaultSession
}
