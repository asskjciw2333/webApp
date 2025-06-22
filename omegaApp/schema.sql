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

-- Add duty roster related tables
DROP TABLE IF EXISTS team_members;
CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    employee_number TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#3498db',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS duty_assignments;
CREATE TABLE IF NOT EXISTS duty_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES team_members (id),
    UNIQUE(date)
);

DROP TABLE IF EXISTS member_constraints;
CREATE TABLE IF NOT EXISTS member_constraints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    constraint_type TEXT NOT NULL CHECK(constraint_type IN ('fixed', 'date')),
    day_of_week INTEGER CHECK(day_of_week BETWEEN 0 AND 6),
    specific_date TEXT,
    is_available BOOLEAN NOT NULL DEFAULT 0,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES team_members (id)
);

-- Add workload history tracking
DROP TABLE IF EXISTS workload_history;
CREATE TABLE IF NOT EXISTS workload_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    month TEXT NOT NULL,  -- Format: YYYY-MM
    duty_count INTEGER DEFAULT 0,
    last_duty_date TEXT,
    FOREIGN KEY (member_id) REFERENCES team_members (id),
    UNIQUE(member_id, month)
);

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_assignments_date ON duty_assignments(date);
CREATE INDEX IF NOT EXISTS idx_constraints_member ON member_constraints(member_id);
CREATE INDEX IF NOT EXISTS idx_constraints_date ON member_constraints(specific_date);

