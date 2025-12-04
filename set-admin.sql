-- Give yourself admin access
-- Replace 'your-email@example.com' with your actual email address
-- Replace 'Your Name' with your actual name

-- Delete the email if it already exists (to avoid conflicts)
DELETE FROM users WHERE email = 'your-email@example.com';

-- Insert yourself as admin
INSERT INTO users (email, name, role)
VALUES ('your-email@example.com', 'Your Name', 'admin');

-- Verify the user was created
SELECT * FROM users WHERE email = 'your-email@example.com';
