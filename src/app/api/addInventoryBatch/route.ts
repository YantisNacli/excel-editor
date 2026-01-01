import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => createClient(
  process.env.SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { items } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Validate items
    for (const item of items) {
      if (!item.material || typeof item.material !== "string") {
        return NextResponse.json({ error: "All items must have a material" }, { status: 400 });
      }
    }

    // Upsert items to inventory table
    const { error: upsertError } = await supabase
      .from("inventory")
      .upsert(items, { onConflict: "material" });

    if (upsertError) {
      console.error("Error upserting items:", upsertError);
      return NextResponse.json(
        { error: "Failed to add items", details: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: "Items added successfully",
      added: items.length
    });
  } catch (error) {
    console.error("Error adding inventory batch:", error);
    return NextResponse.json(
      { error: "Failed to add items" },
      { status: 500 }
    );
  }
}
