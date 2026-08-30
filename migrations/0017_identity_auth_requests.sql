CREATE TABLE auth_requests (
  uuid                       TEXT     NOT NULL PRIMARY KEY,
  user_uuid                  TEXT     NOT NULL,
  organization_uuid          TEXT,
  request_device_identifier  TEXT     NOT NULL,
  device_type                INTEGER  NOT NULL,
  request_ip                 TEXT     NOT NULL,
  response_device_id         TEXT,
  access_code                TEXT     NOT NULL,
  public_key                 TEXT     NOT NULL,
  enc_key                    TEXT,
  master_password_hash       TEXT,
  approved                   BOOLEAN,
  creation_date              DATETIME NOT NULL,
  response_date              DATETIME,
  authentication_date        DATETIME,
  FOREIGN KEY (user_uuid) REFERENCES users (uuid),
  FOREIGN KEY (organization_uuid) REFERENCES organizations (uuid)
);

CREATE INDEX auth_requests_user_uuid_index ON auth_requests(user_uuid);
CREATE INDEX auth_requests_organization_uuid_index ON auth_requests(organization_uuid);
CREATE INDEX auth_requests_pending_device_index
  ON auth_requests(user_uuid, request_device_identifier, approved, creation_date);
