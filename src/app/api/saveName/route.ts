import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error("Supabase env vars missing");
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });

    // Table name: `user_names` (create this table in Supabase before deploying)
    const table = "user_names";
    const timestamp = new Date().toISOString();

    const { data, error } = await supabase.from(table).insert([{ name, timestamp }]);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: "Failed to save name to DB" }, { status: 500 });
    }

    return NextResponse.json({ message: "Name saved successfully", data }, { status: 200 });
  } catch (err) {
    console.error("Error saving name:", err);
    return NextResponse.json({ error: "Failed to save name" }, { status: 500 });
  }
}
