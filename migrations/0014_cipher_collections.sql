CREATE TABLE ciphers_collections (
  cipher_uuid     TEXT NOT NULL,
  collection_uuid TEXT NOT NULL,
  PRIMARY KEY (cipher_uuid, collection_uuid),
  FOREIGN KEY (cipher_uuid) REFERENCES ciphers(uuid),
  FOREIGN KEY (collection_uuid) REFERENCES collections(uuid)
);

CREATE INDEX ciphers_collections_cipher_uuid_index ON ciphers_collections(cipher_uuid);
CREATE INDEX ciphers_collections_collection_uuid_index ON ciphers_collections(collection_uuid);
