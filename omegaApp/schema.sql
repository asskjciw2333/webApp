DROP TABLE IF EXISTS automations;
DROP TABLE IF EXISTS issues;
-- DROP TABLE IF EXISTS  panels;

CREATE TABLE
  IF NOT EXISTS panels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dcim_id TEXT,
    room TEXT,
    name TEXT,
    rack TEXT,
    u TEXT,
    interface TEXT,
    size TEXT,
    destination TEXT,
    status TEXT,
    how_many_ports_remain TEXT,
    classification TEXT,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_updated TIMESTAMP
    -- CONSTRAINT idx_room CREATE INDEX IF NOT EXISTS idx_room ON panels(room),
    -- CONSTRAINT idx_rack CREATE INDEX IF NOT EXISTS idx_rack ON panels(rack)
  );

CREATE TABLE
  IF NOT EXISTS automations (
    instance_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT '',
    server_name TEXT NOT NULL DEFAULT '',
    serial_number TEXT NOT NULL DEFAULT '',
    tamplate TEXT NOT NULL DEFAULT '',
    data NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '',
    progress INTEGER NOT NULL DEFAULT 0,
    message TEXT NOT NULL DEFAULT '',
    automation_type TEXT NOT NULL DEFAULT '',
    isTracked BOOLEAN DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    error TEXT DEFAULT '',
    force_direct_upgrade BOOLEAN DEFAULT 0,
    intermediate_version TEXT DEFAULT ''
  );

CREATE TABLE
  IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_name TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    template TEXT,
    serial_number TEXT,
    ticket_number TEXT,
    network TEXT,
    description TEXT NOT NULL DEFAULT '',
    jira_task_id TEXT,
    jira_url TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    created_by TEXT NOT NULL DEFAULT '',
    resolution_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    resolved_at TIMESTAMP
  );
