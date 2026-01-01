import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => createClient(
  process.env.SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    // Get stored verification code from database
    const supabase = getSupabase();
    const { data: storedData, error: fetchError } = await supabase
      .from('verification_codes')
      .select('code, expires')
      .eq('email', normalizedEmail)
      .single();

    if (fetchError || !storedData) {
      return NextResponse.json({ error: "No verification code found. Please request a new code." }, { status: 400 });
    }

    // Check if code is expired
    if (Date.now() > storedData.expires) {
      await supabase.from('verification_codes').delete().eq('email', normalizedEmail);
      return NextResponse.json({ error: "Verification code expired. Please request a new code." }, { status: 400 });
    }

    // Verify code
    if (storedData.code !== code.trim()) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Code is valid, get user data
    const { data: userData, error } = await supabase
      .from("users")
      .select("email, name, role")
      .eq("email", email.trim())
      .single();

    if (error || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete used code
    await supabase.from('verification_codes').delete().eq('email', normalizedEmail);

    // Generate a session token (simple approach - in production use JWT or similar)
    const sessionToken = Buffer.from(`${userData.email}:${Date.now()}:${Math.random()}`).toString('base64');

    return NextResponse.json({
      success: true,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      sessionToken
    });
  } catch (error) {
    console.error("Error verifying code:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
