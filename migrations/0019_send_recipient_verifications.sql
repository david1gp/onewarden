ALTER TABLE sends ADD COLUMN emails TEXT;

CREATE TABLE send_recipient_verifications (
  send_uuid       TEXT NOT NULL,
  email           TEXT NOT NULL,
  otp_hash        TEXT NOT NULL,
  otp_salt        TEXT NOT NULL,
  otp_expires_at  TEXT NOT NULL,
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_sent_at    TEXT NOT NULL,
  resend_count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (send_uuid, email),
  FOREIGN KEY (send_uuid) REFERENCES sends(uuid) ON DELETE CASCADE
);

CREATE INDEX send_recipient_verifications_email_index ON send_recipient_verifications(email);
CREATE INDEX send_recipient_verifications_expiry_index ON send_recipient_verifications(otp_expires_at);
