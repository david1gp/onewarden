CREATE TABLE organizations (
  uuid          TEXT NOT NULL PRIMARY KEY,
  name          TEXT NOT NULL,
  billing_email TEXT NOT NULL,
  private_key   TEXT,
  public_key    TEXT
);

CREATE TABLE users_organizations (
  uuid               TEXT NOT NULL PRIMARY KEY,
  user_uuid          TEXT NOT NULL,
  org_uuid           TEXT NOT NULL,
  invited_by_email   TEXT,
  access_all         INTEGER NOT NULL DEFAULT 0,
  akey               TEXT NOT NULL,
  status             INTEGER NOT NULL,
  atype              INTEGER NOT NULL,
  reset_password_key TEXT,
  external_id        TEXT,
  UNIQUE (user_uuid, org_uuid),
  FOREIGN KEY (user_uuid) REFERENCES users(uuid),
  FOREIGN KEY (org_uuid) REFERENCES organizations(uuid)
);

CREATE TABLE collections (
  uuid        TEXT NOT NULL PRIMARY KEY,
  org_uuid    TEXT NOT NULL,
  name        TEXT NOT NULL,
  external_id TEXT,
  FOREIGN KEY (org_uuid) REFERENCES organizations(uuid)
);

CREATE TABLE users_collections (
  user_uuid       TEXT NOT NULL,
  collection_uuid TEXT NOT NULL,
  read_only       INTEGER NOT NULL DEFAULT 0,
  hide_passwords  INTEGER NOT NULL DEFAULT 0,
  manage          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_uuid, collection_uuid),
  FOREIGN KEY (user_uuid) REFERENCES users(uuid),
  FOREIGN KEY (collection_uuid) REFERENCES collections(uuid)
);

CREATE TABLE groups (
  uuid               TEXT NOT NULL PRIMARY KEY,
  organizations_uuid TEXT NOT NULL,
  name               TEXT NOT NULL,
  access_all         INTEGER NOT NULL DEFAULT 0,
  external_id        TEXT,
  creation_date      TEXT NOT NULL,
  revision_date      TEXT NOT NULL,
  FOREIGN KEY (organizations_uuid) REFERENCES organizations(uuid)
);

CREATE TABLE groups_users (
  groups_uuid              TEXT NOT NULL,
  users_organizations_uuid TEXT NOT NULL,
  UNIQUE (groups_uuid, users_organizations_uuid),
  FOREIGN KEY (groups_uuid) REFERENCES groups(uuid),
  FOREIGN KEY (users_organizations_uuid) REFERENCES users_organizations(uuid)
);

CREATE TABLE collections_groups (
  collections_uuid TEXT NOT NULL,
  groups_uuid      TEXT NOT NULL,
  read_only        INTEGER NOT NULL DEFAULT 0,
  hide_passwords   INTEGER NOT NULL DEFAULT 0,
  manage           INTEGER NOT NULL DEFAULT 0,
  UNIQUE (collections_uuid, groups_uuid),
  FOREIGN KEY (collections_uuid) REFERENCES collections(uuid),
  FOREIGN KEY (groups_uuid) REFERENCES groups(uuid)
);
