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

    // Get all materials from the batch and normalize to uppercase
    const materials = items.map(item => item.material.trim().toUpperCase());

    // Check which ones already exist - use ilike for case-insensitive matching
    let existingItems: any[] = [];
    
    for (const material of materials) {
      const { data, error } = await supabase
        .from("inventory")
        .select("material, actual_count, location")
        .ilike("material", material);
      
      if (error) {
        console.error("Error checking duplicates:", error);
        console.error("Error details:", JSON.stringify(error));
        return NextResponse.json(
          { error: "Failed to check duplicates", details: error.message },
          { status: 500 }
        );
      }
      
      if (data && data.length > 0) {
        existingItems.push(data[0]);
      }
    }

    // Create a map of existing items for easy lookup (using uppercase keys)
    const existingMap = new Map(
      (existingItems || []).map(item => [item.material.toUpperCase(), item])
    );

    // Find duplicates
    const duplicates = items
      .filter(item => existingMap.has(item.material.trim().toUpperCase()))
      .map(item => ({
        material: item.material,
        newData: {
          actual_count: item.actual_count,
          location: item.location
        },
        oldData: existingMap.get(item.material.trim().toUpperCase())
      }));

    return NextResponse.json({
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates,
      newItems: items.filter(item => !existingMap.has(item.material.trim().toUpperCase()))
    });
  } catch (error) {
    console.error("Error checking duplicates:", error);
    return NextResponse.json(
      { error: "Failed to check duplicates" },
      { status: 500 }
    );
  }
}
