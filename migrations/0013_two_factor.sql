ALTER TABLE users ADD COLUMN totp_recover TEXT;

CREATE TABLE twofactor (
  uuid       TEXT NOT NULL PRIMARY KEY,
  user_uuid  TEXT NOT NULL,
  atype      INTEGER NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 1,
  data       TEXT NOT NULL,
  last_used  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_uuid, atype),
  FOREIGN KEY (user_uuid) REFERENCES users(uuid)
);

CREATE TABLE twofactor_incomplete (
  user_uuid    TEXT NOT NULL,
  device_uuid  TEXT NOT NULL,
  device_name  TEXT NOT NULL,
  device_type  INTEGER NOT NULL,
  login_time   TEXT NOT NULL,
  ip_address   TEXT NOT NULL,
  PRIMARY KEY (user_uuid, device_uuid),
  FOREIGN KEY (user_uuid) REFERENCES users(uuid)
);
