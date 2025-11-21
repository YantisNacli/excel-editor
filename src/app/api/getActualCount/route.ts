import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { partNumber } = await req.json();

    if (!partNumber || typeof partNumber !== "string") {
      return NextResponse.json({ error: "Part number is required" }, { status: 400 });
    }

    // Download the Excel file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("uploads")
      .download("Copy of Stock Inventory_29 Oct 2025.xlsm");

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: "File not found" },
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
      return NextResponse.json({ error: "Empty sheet" }, { status: 400 });
    }

    // Find the header row - specifically looking in row index 1 (second row)
    let headerRowIndex = -1;
    let materialIndex = -1;
    let actualCountsIndex = -1;
    
    // Check row index 1 first (second row)
    if (jsonData.length > 1) {
      const row = jsonData[1] as any[];
      const matIdx = row.findIndex((cell) =>
        cell && cell.toString().toLowerCase().includes("material")
      );
      const actIdx = row.findIndex((cell) =>
        cell && cell.toString().toLowerCase().includes("actual") && 
        cell.toString().toLowerCase().includes("count")
      );
      
      if (matIdx !== -1 && actIdx !== -1) {
        headerRowIndex = 1;
        materialIndex = matIdx;
        actualCountsIndex = actIdx;
      }
    }
    
    // If not found in row 1, search other rows
    if (headerRowIndex === -1) {
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        if (i === 1) continue; // Already checked
        const row = jsonData[i] as any[];
        const matIdx = row.findIndex((cell) =>
          cell && cell.toString().toLowerCase().includes("material")
        );
        const actIdx = row.findIndex((cell) =>
          cell && cell.toString().toLowerCase().includes("actual") && 
          cell.toString().toLowerCase().includes("count")
        );
        
        if (matIdx !== -1 && actIdx !== -1) {
          headerRowIndex = i;
          materialIndex = matIdx;
          actualCountsIndex = actIdx;
          break;
        }
      }
    }

    if (headerRowIndex === -1 || materialIndex === -1 || actualCountsIndex === -1) {
      return NextResponse.json(
        { error: "Material or Actual Counts column not found" },
        { status: 400 }
      );
    }

    // Search for the matching part number
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const material = row[materialIndex];
      
      if (material && material.toString().toLowerCase() === partNumber.toLowerCase()) {
        const actualCount = row[actualCountsIndex];
        
        // Check if empty, null, undefined, or 0
        if (actualCount === undefined || actualCount === null || actualCount === "" || actualCount === 0 || actualCount === "0") {
          return NextResponse.json({ 
            actualCount: "There is no stock in the room"
          });
        }
        
        return NextResponse.json({ 
          actualCount: actualCount.toString()
        });
      }
    }

    return NextResponse.json({ 
      actualCount: "Part number not found in inventory"
    });
  } catch (error) {
    console.error("Error getting actual count:", error);
    return NextResponse.json(
      { error: "Failed to get actual count" },
      { status: 500 }
    );
  }
}
