import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const fileName = req.headers.get("X-File-Name") || "uploaded.xlsx";
    
    // Check file extension
    const validExtensions = [".xlsx", ".xlsm", ".xls"];
    const hasValidExtension = validExtensions.some(ext => fileName.toLowerCase().endsWith(ext));

    if (!hasValidExtension) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an Excel file (.xlsx, .xlsm, or .xls)" },
        { status: 400 }
      );
    }

    // Get file data as blob
    const blob = await req.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use fixed filename for consistency
    const uploadFileName = "Copy of Stock Inventory_29 Oct 2025.xlsm";

    // Delete old file if exists
    await supabase.storage.from("uploads").remove([uploadFileName]);

    // Upload new file
    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(uploadFileName, buffer, {
        contentType: "application/vnd.ms-excel.sheet.macroEnabled.12",
        upsert: true
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file", details: uploadError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: "File uploaded successfully",
      fileName: uploadFileName
    });
  } catch (error: any) {
    console.error("Error in upload:", error);
    return NextResponse.json(
      { error: "Failed to upload file", details: error.message },
      { status: 500 }
    );
  }
}
