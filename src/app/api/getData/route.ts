import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
    const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY)?.trim();

    if (!SUPABASE_URL) {
      console.error("SUPABASE_URL env var missing or empty");
      return NextResponse.json({ error: "SUPABASE_URL not configured" }, { status: 500 });
    }

    if (!SUPABASE_KEY) {
      console.error("SUPABASE_SERVICE_ROLE_KEY env var missing or empty");
      return NextResponse.json({ error: "SUPABASE_KEY not configured" }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });

    // Fetch the existing Excel file from Supabase
    const { data: fileData, error: fetchError } = await supabase
      .storage
      .from("uploads")
      .download("data.xlsx");

    if (fetchError) {
      console.error("Error fetching Excel file:", fetchError);
      return NextResponse.json({ error: `Failed to fetch Excel file: ${fetchError.message}` }, { status: 500 });
    }

    // Parse the Excel file
    const fileBuffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(fileBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Skip header row and format data
    const headers = sheetData[0] || [];
    const rows = sheetData.slice(1).map(row => ({
      date: row[0] || "",
      name: row[1] || "",
      partNumber: row[2] || "",
      quantity: row[3] || "",
    }));

    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Error fetching data:", errorMsg);
    return NextResponse.json({ error: `Server error: ${errorMsg}` }, { status: 500 });
  }
}
