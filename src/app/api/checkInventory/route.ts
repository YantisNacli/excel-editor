import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { material } = await req.json();

    if (!material || typeof material !== "string") {
      return NextResponse.json({ error: "Material is required" }, { status: 400 });
    }

    // Query inventory table
    const { data, error } = await supabase
      .from("inventory")
      .select("material, actual_count, location")
      .ilike("material", material)
      .maybeSingle();

    if (error) {
      console.error("Error querying inventory:", error);
      return NextResponse.json(
        { error: "Failed to check inventory" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Part not found in inventory" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error checking inventory:", error);
    return NextResponse.json(
      { error: "Failed to check inventory" },
      { status: 500 }
    );
  }
}
