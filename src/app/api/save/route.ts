import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { filename, base64 } = await req.json();

    if (!filename || !base64) {
      return NextResponse.json({ error: "Missing filename or base64" }, { status: 400 });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error("Supabase env vars missing");
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

    // Ensure bucket 'uploads' exists in Supabase (create it in the dashboard or via SQL before deploying)
    const bucket = 'uploads';
    const filePath = filename;

    // Convert base64 to buffer
    const buffer = Buffer.from(base64, 'base64');

    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', upsert: true });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 });
    }

    // Get public URL (bucket must allow public access or use signed URLs)
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return NextResponse.json({ message: 'File saved to storage', data, publicUrl: publicUrlData.publicUrl }, { status: 200 });
  } catch (err) {
    console.error('Error in /api/save:', err);
    return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
  }
}
