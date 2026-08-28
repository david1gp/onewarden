const identityDeviceTypeNames: Record<number, string> = {
  0: "Android",
  1: "iOS",
  2: "Chrome Extension",
  3: "Firefox Extension",
  4: "Opera Extension",
  5: "Edge Extension",
  6: "Windows",
  7: "macOS",
  8: "Linux",
  9: "Chrome",
  10: "Firefox",
  11: "Opera",
  12: "Edge",
  13: "Internet Explorer",
  14: "Unknown Browser",
  15: "Android",
  16: "UWP",
  17: "Safari",
  18: "Vivaldi",
  19: "Vivaldi Extension",
  20: "Safari Extension",
  21: "SDK",
  22: "Server",
  23: "Windows CLI",
  24: "macOS CLI",
  25: "Linux CLI",
  26: "DuckDuckGo",
}

export function identityDeviceTypeName(type: number): string {
  return identityDeviceTypeNames[type] ?? "Unknown Browser"
}
