CREATE TABLE ciphers (
  uuid               TEXT NOT NULL PRIMARY KEY,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  user_uuid          TEXT,
  organization_uuid  TEXT,
  key                TEXT,
  atype              INTEGER NOT NULL,
  name               TEXT NOT NULL,
  notes              TEXT,
  fields             TEXT,
  data               TEXT NOT NULL,
  password_history   TEXT,
  deleted_at         TEXT,
  reprompt           INTEGER,
  FOREIGN KEY (user_uuid) REFERENCES users(uuid),
  FOREIGN KEY (organization_uuid) REFERENCES organizations(uuid)
);

CREATE INDEX ciphers_user_uuid_index ON ciphers(user_uuid);
CREATE INDEX ciphers_organization_uuid_index ON ciphers(organization_uuid);

CREATE TABLE favorites (
  user_uuid  TEXT NOT NULL,
  cipher_uuid TEXT NOT NULL,
  PRIMARY KEY (user_uuid, cipher_uuid),
  FOREIGN KEY (user_uuid) REFERENCES users(uuid),
  FOREIGN KEY (cipher_uuid) REFERENCES ciphers(uuid)
);

CREATE TABLE archives (
  user_uuid   TEXT NOT NULL,
  cipher_uuid TEXT NOT NULL,
  archived_at TEXT NOT NULL,
  PRIMARY KEY (user_uuid, cipher_uuid),
  FOREIGN KEY (user_uuid) REFERENCES users(uuid),
  FOREIGN KEY (cipher_uuid) REFERENCES ciphers(uuid)
);
