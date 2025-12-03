import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();

    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    // Normalize username to lowercase for consistent lookups
    const normalizedUsername = username.trim().toLowerCase();

    // Query users table
    const { data, error } = await supabase
      .from("users")
      .select("username, role, created_at")
      .ilike("username", normalizedUsername)
      .maybeSingle();

    if (error) {
      console.error("Error querying users:", error);
      return NextResponse.json(
        { error: "Failed to get user" },
        { status: 500 }
      );
    }

    if (!data) {
      // User not found - create as operator by default
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert([{ username: normalizedUsername, role: "operator" }])
        .select("username, role, created_at")
        .single();

      if (createError) {
        console.error("Error creating user:", createError);
        return NextResponse.json(
          { error: "Failed to create user" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        username: newUser.username,
        role: newUser.role,
        isNewUser: true
      });
    }

    return NextResponse.json({
      username: data.username,
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
