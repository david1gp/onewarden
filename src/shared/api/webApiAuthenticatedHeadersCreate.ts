export function webApiAuthenticatedHeadersCreate(accessToken: string, contentType?: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(contentType === undefined ? {} : { "Content-Type": contentType }),
    Accept: "application/json",
  }
}
