-- Create verification codes table
CREATE TABLE IF NOT EXISTS verification_codes (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires);

-- Enable Row Level Security
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since we're using service role key)
CREATE POLICY "Allow all operations" ON verification_codes FOR ALL USING (true);
