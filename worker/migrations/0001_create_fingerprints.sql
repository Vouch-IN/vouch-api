-- Fingerprints table
CREATE TABLE IF NOT EXISTS fingerprints (
  hash TEXT PRIMARY KEY,
  emails_used TEXT NOT NULL, -- JSON array
  projects_seen TEXT NOT NULL, -- JSON array
  signup_count INTEGER NOT NULL DEFAULT 0,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  last_ip TEXT,
) STRICT;

-- Index for faster lookups
CREATE INDEX idx_fingerprints_last_seen ON fingerprints(last_seen);
CREATE INDEX idx_fingerprints_signup_count ON fingerprints(signup_count);
