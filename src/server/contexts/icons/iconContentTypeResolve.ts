export function iconContentTypeResolve(bytes: Uint8Array): string | undefined {
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index])
  )
    return "png"
  if (
    bytes.length >= 6 &&
    bytes[0] === 0 &&
    bytes[1] === 0 &&
    bytes[2] === 1 &&
    bytes[3] === 0 &&
    (bytes[4] !== 0 || bytes[5] !== 0)
  )
    return "x-icon"
  if (
    bytes.length >= 12 &&
    bytes[0] === 82 &&
    bytes[1] === 73 &&
    bytes[2] === 70 &&
    bytes[3] === 70 &&
    bytes[8] === 87 &&
    bytes[9] === 69 &&
    bytes[10] === 66 &&
    bytes[11] === 80
  )
    return "webp"
  if (
    bytes.length >= 4 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255 &&
    bytes[3] !== undefined &&
    bytes[3] >= 192
  )
    return "jpeg"
  if (
    bytes.length >= 6 &&
    bytes[0] === 71 &&
    bytes[1] === 73 &&
    bytes[2] === 70 &&
    bytes[3] === 56 &&
    (bytes[4] === 55 || bytes[4] === 57) &&
    bytes[5] === 97
  )
    return "gif"
  if (
    bytes.length >= 10 &&
    bytes[0] === 66 &&
    bytes[1] === 77 &&
    bytes[6] === 0 &&
    bytes[7] === 0 &&
    bytes[8] === 0 &&
    bytes[9] === 0
  )
    return "bmp"

  const text = new TextDecoder().decode(bytes.subarray(0, 1024))
  if (text.startsWith("<svg") || text.startsWith("<SVG")) return "svg+xml"
  if (text.startsWith("<?xml") && /<svg[\s>]/iu.test(text)) return "svg+xml"
  return undefined
}
