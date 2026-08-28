CREATE TABLE attachments (
  id         TEXT NOT NULL PRIMARY KEY,
  cipher_uuid TEXT NOT NULL,
  file_name  TEXT NOT NULL,
  file_size  INTEGER NOT NULL,
  akey       TEXT,
  FOREIGN KEY (cipher_uuid) REFERENCES ciphers(uuid) ON DELETE CASCADE
);

CREATE INDEX attachments_cipher_uuid_index ON attachments(cipher_uuid);
