import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { query, fileName } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Use the provided fileName or default to the stock inventory file
    const searchFileName = fileName || "Copy of Stock Inventory_29 Oct 2025.xlsm";

    // Download the Excel file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("uploads")
      .download(searchFileName);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: `File not found: ${searchFileName}` },
        { status: 404 }
      );
    }

    // Convert blob to ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // Find the "Master Data" sheet
    const sheetName = workbook.SheetNames.find((name) =>
      name.toLowerCase().includes("master")
    ) || workbook.SheetNames[0];
    
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (jsonData.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Find the header row by looking for "Material" column in the first 10 rows
    let headerRowIndex = -1;
    let partNumberIndex = -1;
    
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i] as any[];
      const materialIndex = row.findIndex((cell) =>
        cell && cell.toString().toLowerCase().includes("material")
      );
      
      if (materialIndex !== -1) {
        headerRowIndex = i;
        partNumberIndex = materialIndex;
        break;
      }
    }

    if (headerRowIndex === -1 || partNumberIndex === -1) {
      // Debug: Return available sheet names and column headers from first few rows
      return NextResponse.json(
        { 
          error: "Material column not found", 
          debug: {
            availableSheets: workbook.SheetNames,
            selectedSheet: sheetName,
            first5Rows: jsonData.slice(0, 5)
          }
        },
        { status: 400 }
      );
    }

    // Search for matches (skip header row)
    const queryLower = query.toLowerCase();
    const matches: string[] = [];
    const seen = new Set<string>();

    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const partNumber = row[partNumberIndex];
      
      if (partNumber && typeof partNumber !== "undefined") {
        const partStr = partNumber.toString();
        const partLower = partStr.toLowerCase();
        
        // Check if it matches the query and hasn't been added yet
        if (partLower.includes(queryLower) && !seen.has(partStr)) {
          matches.push(partStr);
          seen.add(partStr);
        }
      }
    }

    // Sort matches: exact matches first, then starts-with, then contains
    matches.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      
      if (aLower === queryLower && bLower !== queryLower) return -1;
      if (aLower !== queryLower && bLower === queryLower) return 1;
      if (aLower.startsWith(queryLower) && !bLower.startsWith(queryLower)) return -1;
      if (!aLower.startsWith(queryLower) && bLower.startsWith(queryLower)) return 1;
      return a.localeCompare(b);
    });

    // Limit to top 10 matches
    return NextResponse.json({ matches: matches.slice(0, 10) });
  } catch (error) {
    console.error("Error searching part numbers:", error);
    return NextResponse.json(
      { error: "Failed to search part numbers" },
      { status: 500 }
    );
  }
}
