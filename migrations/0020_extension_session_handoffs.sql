CREATE TABLE extension_session_handoffs (
  token_hash           TEXT NOT NULL PRIMARY KEY,
  user_uuid            TEXT NOT NULL,
  source_device_uuid   TEXT NOT NULL,
  operation            TEXT NOT NULL CHECK (operation IN ('create', 'edit')),
  cipher_uuid          TEXT,
  user_key_iv          TEXT NOT NULL,
  user_key_ciphertext  TEXT NOT NULL,
  created_at           TEXT NOT NULL,
  expires_at           TEXT NOT NULL,
  CHECK (
    (operation = 'create' AND cipher_uuid IS NULL) OR
    (operation = 'edit' AND cipher_uuid IS NOT NULL)
  ),
  FOREIGN KEY (user_uuid) REFERENCES users(uuid) ON DELETE CASCADE,
  FOREIGN KEY (source_device_uuid, user_uuid) REFERENCES devices(uuid, user_uuid) ON DELETE CASCADE,
  FOREIGN KEY (cipher_uuid) REFERENCES ciphers(uuid) ON DELETE CASCADE
);

CREATE INDEX extension_session_handoffs_expiry_index ON extension_session_handoffs(expires_at);
CREATE INDEX extension_session_handoffs_user_device_index
  ON extension_session_handoffs(user_uuid, source_device_uuid);
