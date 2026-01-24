import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => createClient(
  process.env.SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    
    // Fetch all inventory data
    const { data, error } = await supabase
      .from("inventory")
      .select("material, actual_count, location")
      .order("material");

    if (error) {
      console.error("Error fetching inventory:", error);
      return NextResponse.json(
        { error: "Failed to fetch inventory data" },
        { status: 500 }
      );
    }

    // Return the data directly as an array
    return NextResponse.json(data || [], { status: 200 });
  } catch (error) {
    console.error("Error in getInventory:", error);
    return NextResponse.json(
      { error: "Server error: " + (error as Error).message },
      { status: 500 }
    );
  }
}
