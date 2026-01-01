-- Create inventory table to store Material, Actual Count, and Location from Excel
CREATE TABLE IF NOT EXISTS inventory (
  material TEXT PRIMARY KEY,
  actual_count INTEGER DEFAULT 0,
  location TEXT
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_inventory_material_lower ON inventory (LOWER(material));

-- Enable Row Level Security
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all access to inventory" ON inventory
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- USER ROLES SYSTEM
-- ============================================

-- Create users table for role-based access control
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('operator', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable Row Level Security for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (will be refined in production)
CREATE POLICY "Allow all access to users" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert a default admin user (change email to your email)
INSERT INTO users (email, name, role) 
VALUES ('admin@example.com', 'Admin User', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Role descriptions:
-- 'viewer'   - Can only view records and inventory, no modifications
-- 'operator' - Can perform transactions (add/remove stock), view records
-- 'admin'    - Full access including user management, imports, and inventory management

