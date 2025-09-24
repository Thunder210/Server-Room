ALTER TABLE dcim.operation_log ADD COLUMN IF NOT EXISTS duration_ms double precision;
ALTER TABLE dcim.operation_log ADD COLUMN IF NOT EXISTS client_ip INET;
