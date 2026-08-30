const contentSecurityPolicy =
  "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:"

export function responseSecurityHeadersApply(response: Response, options?: { spaDocument?: boolean }): Response {
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "SAMEORIGIN")
  response.headers.set("Referrer-Policy", "no-referrer")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()")
  if (options?.spaDocument === true) response.headers.set("Content-Security-Policy", contentSecurityPolicy)
  return response
}
