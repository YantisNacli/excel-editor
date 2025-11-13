import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, "user_names.xlsx");
    let wb: XLSX.WorkBook;
    let ws: XLSX.WorkSheet;

    // Check if file exists
    if (fs.existsSync(filePath)) {
      // Read existing file
      const fileBuffer = fs.readFileSync(filePath);
      wb = XLSX.read(fileBuffer, { type: "buffer" });
      ws = wb.Sheets[wb.SheetNames[0]];
    } else {
      // Create new workbook with headers
      wb = XLSX.utils.book_new();
      ws = XLSX.utils.aoa_to_sheet([["Name", "Timestamp"]]);
      XLSX.utils.book_append_sheet(wb, ws, "Users");
    }

    // Get existing data
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    // Add new name with timestamp
    const timestamp = new Date().toLocaleString();
    data.push([name, timestamp]);

    // Update sheet
    const newWs = XLSX.utils.aoa_to_sheet(data);
    wb.Sheets[wb.SheetNames[0]] = newWs;

    // Write file
    XLSX.writeFile(wb, filePath);

    return NextResponse.json(
      { message: "Name saved successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving name:", error);
    return NextResponse.json(
      { error: "Failed to save name" },
      { status: 500 }
    );
  }
}
