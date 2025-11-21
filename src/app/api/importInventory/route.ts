import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const fileName = "Copy of Stock Inventory_29 Oct 2025.xlsm";

    // Download the Excel file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("uploads")
      .download(fileName);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: `File not found: ${fileName}` },
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

    // Find the header row (specifically looking in row index 1)
    let headerRowIndex = -1;
    let materialIndex = -1;
    let actualCountIndex = -1;
    let locationIndex = -1;
    
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
      const locIdx = row.findIndex((cell) =>
        cell && cell.toString().toLowerCase().includes("location")
      );
      
      if (matIdx !== -1 && actIdx !== -1 && locIdx !== -1) {
        headerRowIndex = 1;
        materialIndex = matIdx;
        actualCountIndex = actIdx;
        locationIndex = locIdx;
      }
    }
    
    // If not found in row 1, search other rows
    if (headerRowIndex === -1) {
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        if (i === 1) continue;
        const row = jsonData[i] as any[];
        const matIdx = row.findIndex((cell) =>
          cell && cell.toString().toLowerCase().includes("material")
        );
        const actIdx = row.findIndex((cell) =>
          cell && cell.toString().toLowerCase().includes("actual") && 
          cell.toString().toLowerCase().includes("count")
        );
        const locIdx = row.findIndex((cell) =>
          cell && cell.toString().toLowerCase().includes("location")
        );
        
        if (matIdx !== -1 && actIdx !== -1 && locIdx !== -1) {
          headerRowIndex = i;
          materialIndex = matIdx;
          actualCountIndex = actIdx;
          locationIndex = locIdx;
          break;
        }
      }
    }

    if (headerRowIndex === -1 || materialIndex === -1 || actualCountIndex === -1 || locationIndex === -1) {
      return NextResponse.json(
        { error: "Required columns not found (Material, Actual Count, Location)" },
        { status: 400 }
      );
    }

    // Extract data from Excel
    const inventoryData: Array<{material: string, actual_count: number, location: string}> = [];
    
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const material = row[materialIndex];
      
      if (material && material.toString().trim() !== "") {
        const actualCount = row[actualCountIndex];
        const location = row[locationIndex];
        
        inventoryData.push({
          material: material.toString().trim(),
          actual_count: (actualCount === undefined || actualCount === null || actualCount === "" || actualCount === 0) ? 0 : parseInt(actualCount.toString()),
          location: location ? location.toString().trim() : ""
        });
      }
    }

    if (inventoryData.length === 0) {
      return NextResponse.json({ error: "No data found in Excel" }, { status: 400 });
    }

    // Upsert data in batches (Supabase has a limit on batch size)
    // This will update existing records and insert new ones
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < inventoryData.length; i += batchSize) {
      const batch = inventoryData.slice(i, i + batchSize);
      const { error: upsertError } = await supabase
        .from("inventory")
        .upsert(batch, { onConflict: "material" });
      
      if (upsertError) {
        console.error("Error upserting batch:", upsertError);
        return NextResponse.json(
          { error: "Failed to import data", details: upsertError.message },
          { status: 500 }
        );
      }
      
      imported += batch.length;
    }

    return NextResponse.json({ 
      message: "Inventory imported successfully",
      imported,
      sheet: sheetName
    });
  } catch (error) {
    console.error("Error importing inventory:", error);
    return NextResponse.json(
      { error: "Failed to import inventory" },
      { status: 500 }
    );
  }
}
