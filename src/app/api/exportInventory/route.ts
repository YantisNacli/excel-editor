import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const getSupabase = () => createClient(
  process.env.SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    // Fetch all data from inventory table
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

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "No inventory data found" },
        { status: 404 }
      );
    }

    // Create worksheet data with headers
    const worksheetData = [
      ["Material", "Actual Count", "Location"], // Header row
      ...data.map(item => [
        item.material,
        item.actual_count,
        item.location || ""
      ])
    ];

    // Create workbook and worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Add AutoFilter to enable column filtering
    // Set the range to cover all data (from A1 to the last column and row)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
    
    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 20 }, // Material column
      { wch: 15 }, // Actual Count column
      { wch: 20 }  // Location column
    ];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Master Data");

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Return file as download
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="inventory-export-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error exporting inventory:", error);
    return NextResponse.json(
      { error: "Failed to export inventory" },
      { status: 500 }
    );
  }
}
