mkdir .\db -Force | Out-Null
@"
CREATE SCHEMA IF NOT EXISTS dcim AUTHORIZATION dcim_owner;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='device_kind') THEN
    CREATE TYPE device_kind AS ENUM ('SERVER','SWITCH','CUSTOM');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS dcim.racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dcim.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id UUID NOT NULL REFERENCES dcim.racks(id) ON DELETE CASCADE,
  kind device_kind NOT NULL,
  label TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dcim.ip_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES dcim.devices(id) ON DELETE CASCADE,
  address INET NOT NULL,
  label TEXT,
  UNIQUE (device_id, address)
);

CREATE TABLE IF NOT EXISTS dcim.mac_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES dcim.devices(id) ON DELETE CASCADE,
  address MACADDR NOT NULL,
  label TEXT,
  UNIQUE (device_id, address)
);

CREATE TABLE IF NOT EXISTS dcim.operation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID,
  rack_id UUID,
  event_type TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE dcim.operation_log ADD COLUMN IF NOT EXISTS duration_ms DOUBLE PRECISION;
ALTER TABLE dcim.operation_log ADD COLUMN IF NOT EXISTS client_ip INET;

CREATE INDEX IF NOT EXISTS idx_devices_rack ON dcim.devices(rack_id);
CREATE INDEX IF NOT EXISTS idx_ips_device ON dcim.ip_addresses(device_id);
CREATE INDEX IF NOT EXISTS idx_macs_device ON dcim.mac_addresses(device_id);
CREATE INDEX IF NOT EXISTS idx_oplog_created_at ON dcim.operation_log(created_at);

INSERT INTO dcim.racks(name,position) VALUES ('Rack A',1),('Rack B',2)
ON CONFLICT (name) DO NOTHING;
"@ | Out-File -Encoding ascii .\db\migrations.sql