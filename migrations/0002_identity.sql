CREATE TABLE users (
  uuid                    TEXT NOT NULL PRIMARY KEY,
  enabled                 INTEGER NOT NULL DEFAULT 1,
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL,
  verified_at             TEXT,
  last_verifying_at       TEXT,
  login_verify_count      INTEGER NOT NULL DEFAULT 0,
  email                   TEXT NOT NULL UNIQUE,
  email_new               TEXT,
  email_new_token         TEXT,
  name                    TEXT NOT NULL,
  password_hash           BLOB NOT NULL,
  salt                    BLOB NOT NULL,
  password_iterations     INTEGER NOT NULL,
  password_hint           TEXT,
  akey                    TEXT NOT NULL,
  private_key             TEXT,
  public_key              TEXT,
  security_stamp          TEXT NOT NULL,
  stamp_exception         TEXT,
  equivalent_domains      TEXT NOT NULL DEFAULT '[]',
  excluded_globals        TEXT NOT NULL DEFAULT '[]',
  client_kdf_type         INTEGER NOT NULL DEFAULT 0,
  client_kdf_iter         INTEGER NOT NULL DEFAULT 600000,
  client_kdf_memory       INTEGER,
  client_kdf_parallelism  INTEGER,
  api_key                 TEXT,
  avatar_color            TEXT,
  external_id             TEXT
);

CREATE TABLE invitations (
  email TEXT NOT NULL PRIMARY KEY
);

CREATE TABLE identity_signing_keys (
  id              INTEGER NOT NULL PRIMARY KEY CHECK (id = 1),
  private_key_pem TEXT NOT NULL,
  public_key_pem  TEXT NOT NULL
);
