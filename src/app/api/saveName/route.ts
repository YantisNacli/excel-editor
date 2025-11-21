import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { name, partNumber } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    if (!partNumber || typeof partNumber !== "string") {
      return NextResponse.json({ error: "Invalid part number" }, { status: 400 });
    }

    // Insert into the database
    const { error } = await supabase
      .from("stock_data")
      .insert({
        name,
        part_number: partNumber,
        quantity: "", // Empty for now, can be added later
      });

    if (error) {
      console.error("Error inserting into database:", error);
      return NextResponse.json(
        { error: "Failed to save to database" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Part number saved successfully" },
      { status: 200 }
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Error saving part number:", errorMsg);
    return NextResponse.json(
      { error: `Server error: ${errorMsg}` },
      { status: 500 }
    );
  }
}
