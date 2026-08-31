export type ServerJobTimers = {
  setTimeout: (callback: () => void, delay: number) => number
  clearTimeout: (handle: number) => void
}
