import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    console.log("Received name:", name);

    if (!name || typeof name !== "string") {
      console.error("Invalid name received:", name);
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

    // Insert into database with current date
    const currentDate = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    
    const { error } = await supabase
      .from("stock_data")
      .insert({ 
        name, 
        part_number: "", 
        quantity: "" 
      });

    if (error) {
      console.error("Error inserting into database:", error);
      return NextResponse.json({ error: `Failed to save: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: "Name saved successfully" }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Error saving name:", errorMsg);
    return NextResponse.json({ error: `Server error: ${errorMsg}` }, { status: 500 });
  }
}
