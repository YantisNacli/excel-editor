import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
    const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY)?.trim();

    if (!SUPABASE_URL) {
      console.error("SUPABASE_URL env var missing or empty");
      return NextResponse.json({ error: "SUPABASE_URL not configured" }, { status: 500 });
    }

    if (!SUPABASE_KEY) {
      console.error("SUPABASE_SERVICE_ROLE_KEY env var missing or empty");
      return NextResponse.json({ error: "SUPABASE_KEY not configured" }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });

    const timestamp = new Date().toISOString();

    const { data, error } = await supabase.from("user_names").insert([{ name, timestamp }]);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: `Supabase error: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: "Name saved successfully", data }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Error saving name:", errorMsg);
    return NextResponse.json({ error: `Server error: ${errorMsg}` }, { status: 500 });
  }
}
