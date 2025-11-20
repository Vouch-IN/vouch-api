-- Add analytics columns to validation_logs
ALTER TABLE validation_logs 
ADD COLUMN country TEXT,
ADD COLUMN device_type TEXT;

-- Add indexes for analytics queries
CREATE INDEX idx_validation_logs_country ON validation_logs(project_id, country);
CREATE INDEX idx_validation_logs_device_type ON validation_logs(project_id, device_type);
