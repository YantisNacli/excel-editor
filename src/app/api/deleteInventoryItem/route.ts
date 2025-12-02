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

    // Normalize material to uppercase for consistent matching
    const normalizedMaterial = material.trim().toUpperCase();

    // Delete from inventory table
    const { error } = await supabase
      .from("inventory")
      .delete()
      .ilike("material", normalizedMaterial);

    if (error) {
      console.error("Error deleting item:", error);
      console.error("Error details:", JSON.stringify(error));
      return NextResponse.json(
        { error: "Failed to delete item", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: "Item deleted successfully",
      material: normalizedMaterial
    });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
