import sqlite3
from pathlib import Path

def migrate_database():
    """
    Migrate the team_members table from using email to employee_number.
    This script should be run after deploying the new schema changes.
    """
    try:
        # Connect to the database
        db_path = Path(__file__).parent.parent / 'instance' / 'omegaapp.sqlite'
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if employee_number column exists
        cursor.execute("PRAGMA table_info(team_members)")
        columns = cursor.fetchall()
        has_employee_number = any(col[1] == 'employee_number' for col in columns)

        if not has_employee_number:
            # Add the employee_number column
            cursor.execute("ALTER TABLE team_members ADD COLUMN employee_number TEXT UNIQUE")
            
            # Get all existing members
            cursor.execute("SELECT id, email FROM team_members WHERE email IS NOT NULL")
            members = cursor.fetchall()
            
            # Update each member with a temporary employee number based on their email
            for member_id, email in members:
                # Generate a temporary employee number (you might want to implement your own logic here)
                temp_employee_number = f"TEMP_{member_id}"
                cursor.execute(
                    "UPDATE team_members SET employee_number = ? WHERE id = ?",
                    (temp_employee_number, member_id)
                )

            # Make employee_number NOT NULL
            cursor.execute("CREATE TABLE team_members_new ("
                         "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                         "name TEXT NOT NULL,"
                         "employee_number TEXT UNIQUE NOT NULL,"
                         "status TEXT DEFAULT 'active',"
                         "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,"
                         "updated_at TIMESTAMP"
                         ")")
            
            # Copy data to new table
            cursor.execute("INSERT INTO team_members_new "
                         "SELECT id, name, employee_number, status, created_at, updated_at "
                         "FROM team_members")
            
            # Drop old table and rename new one
            cursor.execute("DROP TABLE team_members")
            cursor.execute("ALTER TABLE team_members_new RENAME TO team_members")

            conn.commit()
            print("Migration completed successfully.")
        else:
            print("Migration already applied.")

    except sqlite3.Error as e:
        print(f"An error occurred: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_database()
