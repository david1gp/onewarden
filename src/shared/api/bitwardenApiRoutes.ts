export const bitwardenApiRoutes = {
  prelogin: {
    method: "POST",
    paths: ["/api/accounts/prelogin", "/identity/accounts/prelogin", "/identity/accounts/prelogin/password"],
  },
  token: { method: "POST", path: "/identity/connect/token" },
  revisionDate: { method: "GET", path: "/api/accounts/revision-date" },
  sync: { method: "GET", path: "/api/sync" },
  cipherList: { method: "GET", path: "/api/ciphers" },
  cipherRead: { method: "GET", path: "/api/ciphers/:cipher_id" },
  cipherCreate: { method: "POST", path: "/api/ciphers" },
} as const
