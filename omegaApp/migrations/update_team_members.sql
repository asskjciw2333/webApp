-- Add employee_number column
ALTER TABLE team_members ADD COLUMN employee_number TEXT UNIQUE;

-- Remove email column (after making sure all data is migrated if needed)
ALTER TABLE team_members DROP COLUMN email;
