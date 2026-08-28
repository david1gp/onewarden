CREATE TABLE devices (
  uuid                TEXT NOT NULL,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  user_uuid           TEXT NOT NULL,
  name                TEXT NOT NULL,
  atype               INTEGER NOT NULL,
  push_uuid           TEXT,
  push_token          TEXT,
  refresh_token       TEXT NOT NULL,
  twofactor_remember  TEXT,
  PRIMARY KEY (uuid, user_uuid),
  FOREIGN KEY (user_uuid) REFERENCES users(uuid)
 );
