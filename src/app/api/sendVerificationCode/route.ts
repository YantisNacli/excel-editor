import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const getSupabase = () => createClient(
  process.env.SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Check if user exists in database
    const { data: userData, error } = await supabase
      .from("users")
      .select("email, name, role")
      .eq("email", email.trim())
      .single();

    if (error || !userData) {
      return NextResponse.json({ error: "Email not authorized" }, { status: 403 });
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const normalizedEmail = email.trim().toLowerCase();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    // Store code in database (upsert to replace any existing code)
    const { error: dbError } = await supabase
      .from('verification_codes')
      .upsert({
        email: normalizedEmail,
        code: code,
        expires: expiresAt
      }, {
        onConflict: 'email'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, message: "Failed to generate verification code" },
        { status: 500 }
      );
    }

    // Send verification email
    try {
      await resend.emails.send({
        from: 'Stock Tracker <onboarding@resend.dev>', // Update this with your domain
        to: email,
        subject: 'Your Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Stock Tracker Verification</h2>
            <p style="font-size: 16px; color: #666;">Your verification code is:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
            </div>
            <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes.</p>
            <p style="font-size: 14px; color: #999;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Remove the code since we couldn't send the email
      await supabase.from('verification_codes').delete().eq('email', normalizedEmail);
      return NextResponse.json(
        { success: false, message: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: "Verification code sent to your email. Please check your inbox."
    });
  } catch (error) {
    console.error("Error sending verification code:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
