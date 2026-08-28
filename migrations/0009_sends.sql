CREATE TABLE sends (
  uuid               TEXT NOT NULL PRIMARY KEY,
  user_uuid          TEXT,
  organization_uuid  TEXT,
  name               TEXT NOT NULL,
  notes              TEXT,
  atype              INTEGER NOT NULL,
  data               TEXT NOT NULL,
  key                TEXT NOT NULL,
  password_hash      BLOB,
  password_salt      BLOB,
  password_iter      INTEGER,
  max_access_count   INTEGER,
  access_count       INTEGER NOT NULL,
  creation_date      TEXT NOT NULL,
  revision_date      TEXT NOT NULL,
  expiration_date    TEXT,
  deletion_date      TEXT NOT NULL,
  disabled           INTEGER NOT NULL,
  hide_email         INTEGER,
  FOREIGN KEY (user_uuid) REFERENCES users(uuid),
  FOREIGN KEY (organization_uuid) REFERENCES organizations(uuid)
);

CREATE INDEX sends_user_uuid_index ON sends(user_uuid);
CREATE INDEX sends_organization_uuid_index ON sends(organization_uuid);
