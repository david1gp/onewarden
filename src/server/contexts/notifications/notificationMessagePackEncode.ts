export type NotificationMessagePackValue =
  | boolean
  | Date
  | number
  | string
  | null
  | readonly NotificationMessagePackValue[]
  | { readonly [key: string]: NotificationMessagePackValue }

export function notificationMessagePackEncode(value: NotificationMessagePackValue): Uint8Array {
  const bytes: number[] = []
  notificationMessagePackValueEncode(value, bytes)
  return Uint8Array.from(bytes)
}

function notificationMessagePackValueEncode(value: NotificationMessagePackValue, bytes: number[]): void {
  if (value === null) {
    bytes.push(0xc0)
    return
  }
  if (typeof value === "boolean") {
    bytes.push(value ? 0xc3 : 0xc2)
    return
  }
  if (typeof value === "number") {
    notificationMessagePackNumberEncode(value, bytes)
    return
  }
  if (typeof value === "string") {
    notificationMessagePackStringEncode(value, bytes)
    return
  }
  if (value instanceof Date) {
    notificationMessagePackDateEncode(value, bytes)
    return
  }
  if (Array.isArray(value)) {
    notificationMessagePackArrayPrefixEncode(value.length, bytes)
    for (const item of value) notificationMessagePackValueEncode(item, bytes)
    return
  }

  const entries = Object.entries(value)
  notificationMessagePackMapPrefixEncode(entries.length, bytes)
  for (const [key, entryValue] of entries) {
    notificationMessagePackStringEncode(key, bytes)
    notificationMessagePackValueEncode(entryValue, bytes)
  }
}

function notificationMessagePackNumberEncode(value: number, bytes: number[]): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || !Number.isSafeInteger(value)) {
    const view = new DataView(new ArrayBuffer(8))
    view.setFloat64(0, value)
    bytes.push(0xcb)
    for (let index = 0; index < 8; index += 1) bytes.push(view.getUint8(index))
    return
  }
  if (value >= 0 && value <= 0x7f) {
    bytes.push(value)
    return
  }
  if (value < 0 && value >= -0x20) {
    bytes.push(0x100 + value)
    return
  }
  if (value >= 0 && value <= 0xff) {
    bytes.push(0xcc, value)
    return
  }
  if (value >= 0 && value <= 0xffff) {
    bytes.push(0xcd, value >> 8, value & 0xff)
    return
  }
  if (value >= 0 && value <= 0xffffffff) {
    bytes.push(0xce)
    notificationMessagePackUnsignedBytesEncode(BigInt(value), 4, bytes)
    return
  }
  if (value >= 0) {
    bytes.push(0xcf)
    notificationMessagePackUnsignedBytesEncode(BigInt(value), 8, bytes)
    return
  }
  if (value >= -0x80) {
    bytes.push(0xd0, value & 0xff)
    return
  }
  if (value >= -0x8000) {
    bytes.push(0xd1, (value >> 8) & 0xff, value & 0xff)
    return
  }
  if (value >= -0x80000000) {
    bytes.push(0xd2)
    notificationMessagePackUnsignedBytesEncode(BigInt.asUintN(32, BigInt(value)), 4, bytes)
    return
  }
  bytes.push(0xd3)
  notificationMessagePackUnsignedBytesEncode(BigInt.asUintN(64, BigInt(value)), 8, bytes)
}

function notificationMessagePackStringEncode(value: string, bytes: number[]): void {
  const encoded = new TextEncoder().encode(value)
  const length = encoded.length
  if (length <= 0x1f) bytes.push(0xa0 | length)
  else if (length <= 0xff) bytes.push(0xd9, length)
  else if (length <= 0xffff) bytes.push(0xda, length >> 8, length & 0xff)
  else {
    bytes.push(0xdb)
    notificationMessagePackUnsignedBytesEncode(BigInt(length), 4, bytes)
  }
  bytes.push(...encoded)
}

function notificationMessagePackArrayPrefixEncode(length: number, bytes: number[]): void {
  if (length <= 0x0f) {
    bytes.push(0x90 | length)
    return
  }
  if (length <= 0xffff) {
    bytes.push(0xdc, length >> 8, length & 0xff)
    return
  }
  bytes.push(0xdd)
  notificationMessagePackUnsignedBytesEncode(BigInt(length), 4, bytes)
}

function notificationMessagePackMapPrefixEncode(length: number, bytes: number[]): void {
  if (length <= 0x0f) {
    bytes.push(0x80 | length)
    return
  }
  if (length <= 0xffff) {
    bytes.push(0xde, length >> 8, length & 0xff)
    return
  }
  bytes.push(0xdf)
  notificationMessagePackUnsignedBytesEncode(BigInt(length), 4, bytes)
}

function notificationMessagePackDateEncode(value: Date, bytes: number[]): void {
  const milliseconds = value.getTime()
  if (!Number.isFinite(milliseconds)) {
    bytes.push(0xc0)
    return
  }
  const seconds = Math.floor(milliseconds / 1_000)
  const nanos = (milliseconds - seconds * 1_000) * 1_000_000
  const timestamp = (BigInt(nanos) << 34n) | BigInt(seconds)
  bytes.push(0xd7, 0xff)
  notificationMessagePackUnsignedBytesEncode(BigInt.asUintN(64, timestamp), 8, bytes)
}

function notificationMessagePackUnsignedBytesEncode(value: bigint, size: number, bytes: number[]): void {
  for (let index = size - 1; index >= 0; index -= 1) {
    bytes.push(Number((value >> BigInt(index * 8)) & 0xffn))
  }
}
