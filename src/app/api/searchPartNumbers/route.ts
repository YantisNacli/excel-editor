import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (query.length < 2) {
      return NextResponse.json({ matches: [] });
    }

    const queryLower = query.toLowerCase();

    // Query inventory table for matching materials
    const { data, error } = await supabase
      .from("inventory")
      .select("material")
      .ilike("material", `${query}%`)
      .order("material")
      .limit(10);

    if (error) {
      console.error("Error querying inventory:", error);
      return NextResponse.json(
        { error: "Failed to search part numbers" },
        { status: 500 }
      );
    }

    const matches = data ? data.map(item => item.material) : [];

    // Sort matches: exact matches first, then alphabetically
    matches.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      
      if (aLower === queryLower && bLower !== queryLower) return -1;
      if (aLower !== queryLower && bLower === queryLower) return 1;
      return a.localeCompare(b);
    });

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("Error searching part numbers:", error);
    return NextResponse.json(
      { error: "Failed to search part numbers" },
      { status: 500 }
    );
  }
}
