const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read Supabase credentials from .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = envContent.match(/SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadExcelFile() {
  const fileName = 'Copy of Stock Inventory_29 Oct 2025.xlsm';
  const filePath = path.join(__dirname, fileName);

  // Check if file exists locally
  if (!fs.existsSync(filePath)) {
    console.error(`Error: ${fileName} not found in project root`);
    console.log('Please place the Excel file in:', __dirname);
    return;
  }

  // Read the file
  const fileBuffer = fs.readFileSync(filePath);

  console.log('Uploading file to Supabase Storage...');

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(fileName, fileBuffer, {
      contentType: 'application/vnd.ms-excel.sheet.macroEnabled.12',
      upsert: true
    });

  if (error) {
    console.error('Upload failed:', error);
  } else {
    console.log('✅ File uploaded successfully!');
    console.log('Path:', data.path);
  }
}

uploadExcelFile();
