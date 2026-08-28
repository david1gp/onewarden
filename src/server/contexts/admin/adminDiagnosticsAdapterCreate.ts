import type { AdminDiagnosticsAdapter } from "./adminDiagnosticsAdapter.js"

export function adminDiagnosticsAdapterCreate(): AdminDiagnosticsAdapter {
  return {
    collect: ({ ipHeaderName, requestUrl }) => ({
      dns_resolved: "Unable to resolve domain name.",
      has_http_access: false,
      ip_header_exists: ipHeaderName.length > 0,
      ip_header_match: ipHeaderName.toLowerCase() === "x-real-ip",
      ip_header_name: ipHeaderName,
      ip_header_config: "X-Real-IP",
      ntp_time: "Unable to fetch NTP time.",
      request_url: requestUrl,
      running_within_container: false,
      uses_proxy: false,
    }),
  }
}
