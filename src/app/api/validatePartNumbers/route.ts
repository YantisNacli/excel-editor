import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => createClient(
  process.env.SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { partNumbers } = await req.json();

    if (!Array.isArray(partNumbers) || partNumbers.length === 0) {
      return NextResponse.json({ validPartNumbers: [] });
    }

    const validPartNumbers: string[] = [];
    const checkedParts = new Set<string>();

    // Check each part number against the inventory database
    for (const partNumber of partNumbers) {
      // Skip if we've already checked this part number
      if (checkedParts.has(partNumber)) continue;
      checkedParts.add(partNumber);

      const { data, error } = await supabase
        .from("inventory")
        .select("material")
        .eq("material", partNumber)
        .single();

      if (!error && data) {
        // Found a valid part number - add to results
        validPartNumbers.push(partNumber);
      }
    }

    // Return all valid part numbers found
    return NextResponse.json({ validPartNumbers });
  } catch (error) {
    console.error("Error validating part numbers:", error);
    return NextResponse.json({ validPartNumbers: [] }, { status: 500 });
  }
}
