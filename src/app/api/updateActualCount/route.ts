import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => createClient(
  process.env.SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { partNumber, quantityChange } = await req.json();

    if (!partNumber || typeof partNumber !== "string") {
      return NextResponse.json({ error: "Part number is required" }, { status: 400 });
    }

    if (!quantityChange || typeof quantityChange !== "string") {
      return NextResponse.json({ error: "Quantity change is required" }, { status: 400 });
    }

    // Parse the quantity change (e.g., "+5" or "-3")
    const change = parseInt(quantityChange);
    if (isNaN(change)) {
      return NextResponse.json({ error: "Invalid quantity format" }, { status: 400 });
    }

    // Update inventory table using atomic increment
    const { data, error } = await supabase.rpc('increment_actual_count', {
      p_material: partNumber,
      p_change: change
    });

    if (error) {
      // If RPC doesn't exist, fall back to manual update
      console.log("RPC not found, using manual update");
      
      // Get current value
      const { data: currentData, error: selectError } = await supabase
        .from("inventory")
        .select("actual_count")
        .ilike("material", partNumber)
        .maybeSingle();

      if (selectError) {
        console.error("Error querying inventory:", selectError);
        return NextResponse.json(
          { error: "Failed to update actual count" },
          { status: 500 }
        );
      }

      if (!currentData) {
        return NextResponse.json(
          { error: "Part number not found in inventory" },
          { status: 404 }
        );
      }

      const currentValue = currentData.actual_count || 0;
      const newValue = currentValue + change;

      // Update with new value
      const { error: updateError } = await supabase
        .from("inventory")
        .update({ actual_count: newValue })
        .ilike("material", partNumber);

      if (updateError) {
        console.error("Error updating inventory:", updateError);
        return NextResponse.json(
          { error: "Failed to update actual count" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ 
      message: "Actual count updated successfully"
    });
  } catch (error) {
    console.error("Error updating actual count:", error);
    return NextResponse.json(
      { error: "Failed to update actual count" },
      { status: 500 }
    );
  }
}
