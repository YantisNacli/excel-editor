import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  try {
    const { rowIndex } = await req.json();

    if (typeof rowIndex !== "number" || rowIndex < 0) {
      return NextResponse.json({ error: "Invalid row index" }, { status: 400 });
    }

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

    // Remove the row (rowIndex + 1 because of header row)
    sheetData.splice(rowIndex + 1, 1);

    // Convert back to Excel format
    const updatedWorksheet = XLSX.utils.aoa_to_sheet(sheetData);
    workbook.Sheets[sheetName] = updatedWorksheet;
    const updatedExcel = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    // Remove the old file and upload the updated Excel file back to Supabase
    await supabase.storage.from("uploads").remove(["data.xlsx"]);
    
    const { error: uploadError } = await supabase
      .storage
      .from("uploads")
      .upload("data.xlsx", updatedExcel);

    if (uploadError) {
      console.error("Error uploading updated Excel file:", uploadError);
      return NextResponse.json({ error: `Failed to upload updated Excel file: ${uploadError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: "Row deleted successfully" }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Error deleting row:", errorMsg);
    return NextResponse.json({ error: `Server error: ${errorMsg}` }, { status: 500 });
  }
}
