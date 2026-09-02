export function demoNavigationClickHandleCreate(navigate?: (path: string) => void) {
  return (path: string) => (event: MouseEvent) => {
    if (
      navigate === undefined ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return
    }

    event.preventDefault()
    navigate(path)
  }
}
