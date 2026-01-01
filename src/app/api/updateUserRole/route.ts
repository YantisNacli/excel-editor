import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => createClient(
  process.env.SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { email, newRole } = await req.json();

    if (!email || !newRole) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    if (!["viewer", "operator", "admin"].includes(newRole)) {
      return NextResponse.json(
        { error: "Invalid role. Must be viewer, operator, or admin" },
        { status: 400 }
      );
    }

    // Update user role
    const { data, error } = await supabase
      .from("users")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .ilike("email", email.trim().toLowerCase())
      .select()
      .single();

    if (error) {
      console.error("Error updating user role:", error);
      return NextResponse.json(
        { error: "Failed to update user role" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "User role updated successfully",
      user: data
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}
