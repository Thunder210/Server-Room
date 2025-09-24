SET search_path TO dcim, public;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_kind') THEN
    CREATE TYPE device_kind AS ENUM ('SERVER','SWITCH','CUSTOM');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
  kind device_kind NOT NULL,
  label TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ip_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  address INET NOT NULL,
  label TEXT,
  UNIQUE (device_id, address)
);

CREATE TABLE IF NOT EXISTS mac_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  address MACADDR NOT NULL,
  label TEXT,
  UNIQUE (device_id, address)
);

CREATE TABLE IF NOT EXISTS operation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID,
  rack_id UUID,
  event_type TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_devices_rack ON devices(rack_id);
CREATE INDEX IF NOT EXISTS idx_ip_device ON ip_addresses(device_id);
CREATE INDEX IF NOT EXISTS idx_mac_device ON mac_addresses(device_id);
CREATE INDEX IF NOT EXISTS idx_log_created ON operation_log(created_at DESC);

INSERT INTO racks(name, position)
VALUES ('Rack A',1),('Rack B',2)
ON CONFLICT (name) DO NOTHING;
