CREATE TABLE org_policies (
  uuid      TEXT     NOT NULL PRIMARY KEY,
  org_uuid  TEXT     NOT NULL REFERENCES organizations (uuid),
  atype     INTEGER  NOT NULL,
  enabled   BOOLEAN  NOT NULL,
  data      TEXT     NOT NULL,
  revision_date TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z',

  UNIQUE (org_uuid, atype)
);

ALTER TABLE organizations ADD COLUMN identifier TEXT;

CREATE TABLE organization_domains (
  uuid            TEXT NOT NULL PRIMARY KEY,
  org_uuid        TEXT NOT NULL,
  txt             TEXT NOT NULL,
  domain_name     TEXT NOT NULL,
  creation_date   TEXT NOT NULL,
  next_run_date   TEXT NOT NULL,
  job_run_count   INTEGER NOT NULL DEFAULT 0,
  verified_date   TEXT,
  last_checked_date TEXT,
  UNIQUE (org_uuid, domain_name),
  FOREIGN KEY (org_uuid) REFERENCES organizations(uuid)
);

CREATE INDEX organization_domains_org_uuid_index ON organization_domains(org_uuid);
CREATE INDEX organization_domains_domain_name_index ON organization_domains(domain_name);

CREATE TABLE organization_sso_configs (
  org_uuid       TEXT NOT NULL PRIMARY KEY,
  enabled        INTEGER NOT NULL,
  data           TEXT NOT NULL,
  creation_date  TEXT NOT NULL,
  revision_date  TEXT NOT NULL,
  FOREIGN KEY (org_uuid) REFERENCES organizations(uuid)
);

ALTER TABLE sso_auth ADD COLUMN organization_uuid TEXT REFERENCES organizations(uuid);
