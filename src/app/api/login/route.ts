import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Get user from database
    const { data: userData, error } = await supabase
      .from("users")
      .select("email, name, role, password, must_change_password")
      .eq("email", normalizedEmail)
      .single();

    if (error || !userData) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if user has a password set
    if (!userData.password) {
      return NextResponse.json(
        { error: "Password not set. Please contact administrator." },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userData.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if user must change password
    if (userData.must_change_password) {
      return NextResponse.json({
        success: true,
        mustChangePassword: true,
        user: {
          email: userData.email,
          name: userData.name,
          role: userData.role,
        },
      });
    }

    // Generate session token
    const sessionToken = Buffer.from(
      `${userData.email}:${Date.now()}:${Math.random()}`
    ).toString("base64");

    return NextResponse.json({
      success: true,
      mustChangePassword: false,
      user: {
        email: userData.email,
        name: userData.name,
        role: userData.role,
      },
      sessionToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
