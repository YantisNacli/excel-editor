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
