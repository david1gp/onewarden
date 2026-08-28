CREATE TABLE folders (
  uuid       TEXT NOT NULL PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  user_uuid  TEXT NOT NULL,
  name       TEXT NOT NULL,
  FOREIGN KEY (user_uuid) REFERENCES users(uuid)
);

CREATE TABLE folders_ciphers (
  cipher_uuid TEXT NOT NULL,
  folder_uuid TEXT NOT NULL,
  PRIMARY KEY (cipher_uuid, folder_uuid),
  FOREIGN KEY (folder_uuid) REFERENCES folders(uuid)
);

CREATE INDEX folders_user_uuid_index ON folders(user_uuid);
