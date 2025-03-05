import sqlite3
import os

# הגדר את שם בסיס הנתונים
DB_NAME = "omegaapp.sqlite"

# SQL commands
CREATE_PANELS_TABLE = """
CREATE TABLE IF NOT EXISTS panels (
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
);
"""

CREATE_AUTOMATIONS_TABLE = """
CREATE TABLE IF NOT EXISTS automations (
    instance_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    server_name TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    tamplate TEXT NOT NULL,
    data NOT NULL,
    status TEXT NOT NULL,
    progress INTEGER NOT NULL,
    message TEXT NOT NULL,
    automation_type TEXT NOT NULL,
    isTracked BOOLEAN DEFAULT 1,
    created_at TEXT NOT NULL,
    error TEXT
);
"""

# Sample data for panels
INSERT_PANELS_DATA = """
INSERT INTO panels (
    dcim_id, room, name, rack, u, interface, size, 
    destination, status, how_many_ports_remain, classification
) VALUES
    ('DCIM001', 'ROOM1', 'Panel-01', 'A01-C02', '42', 'RJ', '48', 'A01-C03', 'True', 'A01-C03: 12', 'red'),
    ('DCIM002', 'ROOM1', 'Panel-02', 'A01-C02', '41', 'RJ', '24', 'A05-C09', 'True', 'A05-C09: 8', 'black'),
    ('DCIM003', 'ROOM2', 'Panel-03', 'A01-C03', '42', 'MM-LC', '24', 'A05-C10', 'True', 'A05-C10: 16', 'red'),
    ('DCIM004', 'ROOM2', 'Panel-04', 'A01-C05', '42', 'SM-LC', '48', 'A07-C07', 'False', 'A07-C07: 0', 'black'),
    ('DCIM005', 'ROOM2', 'Panel-05', 'A05-C09', '41', 'RJ', '48', 'A07-C09', 'True', 'A07-C09: 24', 'red'),
    ('DCIM006', 'ROOM2', 'Panel-06', 'A05-C09', '42', 'MM-LC', '24', 'A01-C02', 'False', 'A01-C02: 24', 'black'),
    ('DCIM007', 'ROOM2', 'Panel-07', 'A05-C10', '42', 'RJ', '48', 'A07-C07', 'True', 'A07-C07: 36', 'red'),
    ('DCIM008', 'ROOM3', 'Panel-08', 'A07-C07', '41', 'SM-LC', '24', 'A01-C05', 'True', 'A01-C05: 18', 'black'),
    ('DCIM009', 'ROOM3', 'Panel-09', 'A07-C07', '42', 'RJ', '48', 'A01-C02', 'True', 'A01-C02: 42', 'red'),
    ('DCIM010', 'ROOM4', 'Panel-10', 'A07-C09', '42', 'MM-LC', '24', 'A05-C09', 'True', 'A05-C09: 4', 'black');
"""

# Sample data for automations
INSERT_AUTOMATIONS_DATA = """
INSERT INTO automations (
    instance_id, user_id, server_name, serial_number, tamplate, 
    data, status, progress, message, automation_type, created_at
) VALUES
    ('AUTO001', 'admin', 'Server-01', 'SN001', 'FW-Update-2.1',
     '{"version": "2.1.5", "backup": true}', 'Completed', 100, 
     'Firmware update in progress', 'FIRMWARE_UPDATE',
     datetime('now', '-2 hours')),
    ('AUTO002', 'admin', 'Server-01', 'SN002', 'FW-Update-2.1',
     '{"version": "2.1.5", "backup": true}', 'Completed', 101, 
     'Firmware update completed successfully', 'FIRMWARE_UPDATE',
     datetime('now', '-2 hours')),
    ('AUTO003', 'admin', 'Server-01', 'SN003', 'FW-Update-2.1',
     '{"version": "2.1.5", "backup": true}', 'failed', 30, 
     'Error!! TEST', 'FIRMWARE_UPDATE',
     datetime('now', '-2 hours')),
    ('AUTO004', 'admin', 'Server-02', 'SN004', 'Password-Reset',
     '{"complexity": "high", "length": 16}', 'In Progress', 60,
     'Generating new credentials', 'PASSWORD_MANAGEMENT',
     datetime('now', '-1 hour'))
"""


def setup_database():
    """Set up the database with tables and sample data"""
    try:
        # Connect to database (creates it if it doesn't exist)
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()

        print(f"Connected to database: {DB_NAME}")

        # Create tables
        cursor.execute("DROP TABLE IF EXISTS automations;")
        cursor.execute("DROP TABLE IF EXISTS panels;")
        print("Dropped existing tables")

        cursor.execute(CREATE_PANELS_TABLE)
        cursor.execute(CREATE_AUTOMATIONS_TABLE)
        print("Created new tables")

        # Insert sample data
        cursor.execute(INSERT_PANELS_DATA)
        cursor.execute(INSERT_AUTOMATIONS_DATA)
        print("Inserted sample data")

        # Commit changes and close connection
        conn.commit()
        conn.close()
        print("Database setup completed successfully!")

        # Print the location of the database file
        db_path = os.path.abspath(DB_NAME)
        print(f"\nDatabase file location: {db_path}")

    except sqlite3.Error as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    setup_database()
