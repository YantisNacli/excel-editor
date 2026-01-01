-- Add password column and must_change_password flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true;

-- Set default password for all existing users (password: "changeme123")
-- This is hashed using bcrypt with 10 rounds
UPDATE users 
SET password = '$2b$10$HuS8I3sx/BXdof7R.C/WfuqpIquyu8MRaLH5G7iQooUcfrJQ./o22',
    must_change_password = true
WHERE password IS NULL;

-- For new users, you can use this same default password
-- Users will be forced to change it on first login
