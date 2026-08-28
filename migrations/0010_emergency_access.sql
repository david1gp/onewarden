CREATE TABLE emergency_access (
  uuid                  TEXT NOT NULL PRIMARY KEY,
  grantor_uuid          TEXT NOT NULL REFERENCES users (uuid),
  grantee_uuid          TEXT REFERENCES users (uuid),
  email                 TEXT,
  key_encrypted         TEXT,
  atype                 INTEGER NOT NULL,
  status                INTEGER NOT NULL,
  wait_time_days        INTEGER NOT NULL,
  recovery_initiated_at TEXT,
  last_notification_at  TEXT,
  updated_at            TEXT NOT NULL,
  created_at            TEXT NOT NULL
);

CREATE INDEX emergency_access_grantor_uuid_index ON emergency_access(grantor_uuid);
CREATE INDEX emergency_access_grantee_uuid_index ON emergency_access(grantee_uuid);
CREATE INDEX emergency_access_email_index ON emergency_access(email);
