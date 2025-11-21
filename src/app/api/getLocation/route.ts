import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { partNumber } = await req.json();

    if (!partNumber || typeof partNumber !== "string") {
      return NextResponse.json({ error: "Part number is required" }, { status: 400 });
    }

    // Query inventory table
    const { data, error } = await supabase
      .from("inventory")
      .select("location")
      .ilike("material", partNumber)
      .maybeSingle();

    if (error) {
      console.error("Error querying inventory:", error);
      return NextResponse.json(
        { error: "Failed to get location" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ 
        location: "Part number not found in inventory"
      });
    }

    if (!data.location || data.location.trim() === "") {
      return NextResponse.json({ 
        location: "No location information available"
      });
    }

    return NextResponse.json({ location: data.location });
  } catch (error) {
    console.error("Error getting location:", error);
    return NextResponse.json(
      { error: "Failed to get location" },
      { status: 500 }
    );
  }
}
