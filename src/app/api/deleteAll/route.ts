import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { password, email } = await req.json();

    if (!password || !email) {
      return NextResponse.json({ error: "Password and email are required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

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

    // Verify admin credentials
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, password, role")
      .eq("email", normalizedEmail)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    if (userData.role !== 'admin') {
      return NextResponse.json({ error: "Only administrators can perform this action" }, { status: 403 });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userData.password);

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Delete all data from stock_data table
    const { error: deleteError } = await supabase
      .from("stock_data")
      .delete()
      .neq("id", 0); // Delete all rows

    if (deleteError) {
      console.error("Error deleting all data:", deleteError);
      return NextResponse.json({ error: `Failed to delete data: ${deleteError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: "All data deleted successfully" }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Error deleting all data:", errorMsg);
    return NextResponse.json({ error: `Server error: ${errorMsg}` }, { status: 500 });
  }
}