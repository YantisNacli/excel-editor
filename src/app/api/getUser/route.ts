import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Normalize email to lowercase for consistent lookups
    const normalizedEmail = email.trim().toLowerCase();

    // Query users table
    const { data, error } = await supabase
      .from("users")
      .select("email, name, role, created_at")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error("Error querying users:", error);
      return NextResponse.json(
        { error: "Failed to get user" },
        { status: 500 }
      );
    }

    if (!data) {
      // User not found - deny access
      return NextResponse.json(
        { error: "Email not authorized. Please contact an administrator." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      email: data.email,
      name: data.name,
      role: data.role,
      isNewUser: false
    });
  } catch (error) {
    console.error("Error getting user:", error);
    return NextResponse.json(
      { error: "Failed to get user" },
      { status: 500 }
    );
  }
}
