-- Add SDK version tracking to validation_logs
-- Tracks which SDK (client/server) and version the validation request came from

ALTER TABLE validation_logs
ADD COLUMN sdk_version TEXT;

-- Add index for analytics queries on SDK version
CREATE INDEX idx_validation_logs_sdk_version ON validation_logs(project_id, sdk_version);

COMMENT ON COLUMN validation_logs.sdk_version IS 'SDK client and version that made the validation request (e.g., @vouch/js@1.0.0)';
