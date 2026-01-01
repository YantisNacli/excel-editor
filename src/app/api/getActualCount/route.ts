import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const { partNumber } = await req.json();

    if (!partNumber || typeof partNumber !== "string") {
      return NextResponse.json({ error: "Part number is required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Query inventory table
    const { data, error } = await supabase
      .from("inventory")
      .select("actual_count")
      .ilike("material", partNumber)
      .maybeSingle();

    if (error) {
      console.error("Error querying inventory:", error);
      return NextResponse.json(
        { error: "Failed to get actual count" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ 
        actualCount: "Part number not found in inventory"
      });
    }

    if (data.actual_count === 0 || data.actual_count === null) {
      return NextResponse.json({ actualCount: "There is no stock in the room" });
    }

    return NextResponse.json({ actualCount: data.actual_count.toString() });
  } catch (error) {
    console.error("Error getting actual count:", error);
    return NextResponse.json(
      { error: "Failed to get actual count" },
      { status: 500 }
    );
  }
}
