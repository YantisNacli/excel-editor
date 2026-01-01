import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, name, role } = await req.json();

    if (!email || !name || !role) {
      return NextResponse.json(
        { error: "Email, name, and role are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (!["viewer", "operator", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be viewer, operator, or admin" },
        { status: 400 }
      );
    }

    // Hash the default password "changeme123"
    const defaultPassword = await bcrypt.hash("changeme123", 10);

    // Insert new user with default password
    const { data, error } = await supabase
      .from("users")
      .insert([{
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: role,
        password: defaultPassword,
        must_change_password: true
      }])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") { // Unique violation
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 409 }
        );
      }
      console.error("Error creating user:", error);
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "User created successfully",
      user: data
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
