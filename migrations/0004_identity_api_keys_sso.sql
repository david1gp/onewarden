CREATE TABLE organization_api_key (
  uuid          TEXT NOT NULL,
  org_uuid      TEXT NOT NULL,
  atype         INTEGER NOT NULL,
  api_key       TEXT NOT NULL,
  revision_date TEXT NOT NULL,
  PRIMARY KEY (uuid, org_uuid)
);

CREATE TABLE sso_auth (
  state                TEXT NOT NULL PRIMARY KEY,
  client_challenge     TEXT NOT NULL,
  nonce                TEXT NOT NULL,
  redirect_uri         TEXT NOT NULL,
  code_response        TEXT,
  code_response_error  TEXT,
  auth_response        TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  binding_hash         TEXT
);

CREATE TABLE sso_users (
  user_uuid  TEXT NOT NULL PRIMARY KEY,
  identifier TEXT NOT NULL UNIQUE,
  FOREIGN KEY (user_uuid) REFERENCES users(uuid)
);
