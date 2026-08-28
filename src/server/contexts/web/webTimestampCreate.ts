export function webTimestampCreate(date: Date): string {
  const timestamp = date.toISOString()
  return timestamp.replace(/\.(\d{3})Z$/, ".$1000Z")
}
