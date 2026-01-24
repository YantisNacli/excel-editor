"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

type ComparisonResult = {
  onlyInWebsite: any[];
  onlyInFile: any[];
  differences: any[];
  identical: any[];
};

export default function ComparePage() {
  const [fileData, setFileData] = useState<any[]>([]);
  const [websiteData, setWebsiteData] = useState<any[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isViewer, setIsViewer] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [bulkDeletePassword, setBulkDeletePassword] = useState("");
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  useEffect(() => {
    const userRole = localStorage.getItem('stockTrackerUserRole');
    setIsAdmin(userRole === 'admin');
    setIsViewer(userRole === 'viewer');
    
    // Load website data on mount
    loadWebsiteData();
  }, []);

  const loadWebsiteData = async () => {
    try {
      const response = await fetch("/api/getInventory");
      if (response.ok) {
        const data = await response.json();
        console.log("Loaded website data:", data?.length || 0, "items");
        setWebsiteData(data || []);
      } else {
        console.error("Failed to load website data, status:", response.status);
        const errorData = await response.json().catch(() => ({}));
        alert("Failed to load website data: " + (errorData.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error loading website data:", error);
      alert("Error loading website data: " + (error as Error).message);
    }
  };

  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: "binary" });
        
        console.log(`File - Available sheets:`, workbook.SheetNames);
        
        // Look for "Master Data" sheet first, otherwise use first sheet
        let sheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes("master") || name.toLowerCase().includes("masterdata")
        ) || workbook.SheetNames[0];
        
        console.log(`File - Using sheet: "${sheetName}"`);
        
        const sheet = workbook.Sheets[sheetName];
        
        // First, read as array to check for embedded headers
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        console.log(`File - Raw first 2 rows:`, rawData.slice(0, 2));
        
        // Check if first row of data contains header keywords
        let startRow = 0;
        if (rawData.length > 0) {
          const firstRow = rawData[0];
          const hasHeaderText = firstRow.some((val: any) => 
            typeof val === 'string' && 
            (val.includes('Material') || val.includes('Location') || val.includes('Actual Counts') || val.includes('Count') || val.includes('Plnt') || val.includes('SLoc'))
          );
          
          if (hasHeaderText) {
            console.log(`File - Using row 0 as headers`);
            startRow = 0;
          } else {
            console.log(`File - No header keywords found in row 0, using default`);
          }
        }
        
        // Read with proper headers
        let data = XLSX.utils.sheet_to_json(sheet, { range: startRow });
        
        console.log(`File - Rows loaded:`, data.length);
        console.log(`File - First data row:`, data[0]);
        
        // Check if the first data row actually contains header text as values
        if (data.length > 0 && data[0]) {
          const firstRowValues = Object.values(data[0] as any);
          const hasHeaderAsValue = firstRowValues.some((val: any) => 
            typeof val === 'string' && 
            (val === 'Material' || val === 'Location' || val === 'Actual Counts' || val === 'Plnt' || val === 'SLoc')
          );
          
          if (hasHeaderAsValue) {
            console.log(`File - First data row contains headers, re-reading from row 1`);
            data = XLSX.utils.sheet_to_json(sheet, { range: startRow + 1 });
            console.log(`File - After correction - Rows loaded:`, data.length);
            console.log(`File - After correction - First data row:`, data[0]);
          }
        }

        // Normalize blank count values to 0
        const normalizedData = data.map((item: any, index: any) => {
          const normalized = { ...item };
          
          // Ensure Actual Counts exists and handle blanks
          if (!normalized['Actual Counts'] || normalized['Actual Counts'] === "" || normalized['Actual Counts'] === null || normalized['Actual Counts'] === undefined || (typeof normalized['Actual Counts'] === "string" && normalized['Actual Counts'].trim() === "")) {
            normalized['Actual Counts'] = 0;
          }
          
          // Also handle any other count-related columns
          Object.keys(normalized).forEach(key => {
            if (key.toLowerCase().includes('count') || key.toLowerCase().includes('actual')) {
              const value = normalized[key];
              if (index < 3) {
                console.log(`Row ${index}, Key: ${key}, Value: "${value}", Type: ${typeof value}`);
              }
              if (value === "" || value === null || value === undefined || value === " " || (typeof value === "string" && value.trim() === "")) {
                normalized[key] = 0;
              }
            }
          });
          return normalized;
        });

        setFileData(normalizedData);
        setFileName(file.name);
      } catch (error) {
        alert("Error reading file. Please ensure it's a valid Excel file.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const compareFiles = () => {
    console.log("Compare button clicked!");
    console.log("File data length:", fileData.length);
    console.log("Website data length:", websiteData.length);
    
    if (!fileData.length) {
      alert("Please upload a file first!");
      return;
    }
    
    if (!websiteData.length) {
      alert("Website data is not loaded yet. Please wait or refresh the page.");
      return;
    }
    
    setLoading(true);

    setTimeout(() => {
      console.log("File sample:", fileData[0]);
      console.log("Website sample:", websiteData[0]);
      
      const materialKey = 'Material';
      const countKey = 'Actual Counts';
      const locationKey = 'Location';
      
      console.log("Using keys:", { materialKey, countKey, locationKey });

      const fileMap = new Map(fileData.map((item: any) => [item[materialKey], item]));
      const websiteMap = new Map(websiteData.map((item: any) => [item.material, item]));

      const onlyInWebsite: any[] = [];
      const onlyInFile: any[] = [];
      const differences: any[] = [];
      const identical: any[] = [];

      // Check items in website
      websiteMap.forEach((webItem, material) => {
        if (!fileMap.has(material)) {
          onlyInWebsite.push(webItem);
        } else {
          const fileItem = fileMap.get(material);
          const webCount = webItem.actual_count || 0;
          const fileCount = fileItem[countKey] === "" || fileItem[countKey] === null || fileItem[countKey] === undefined ? 0 : fileItem[countKey];
          
          const webLocation = webItem.location || "";
          const fileLocation = fileItem[locationKey] || "";
          const webLocIsBlank = webLocation.trim() === "";
          const fileLocIsBlank = fileLocation.trim() === "";
          
          const locationDifferent = (webLocIsBlank !== fileLocIsBlank) || (!webLocIsBlank && !fileLocIsBlank && webLocation !== fileLocation);
          
          if (webCount !== fileCount || locationDifferent) {
            differences.push({
              material,
              website: webItem,
              file: fileItem,
              countDiff: fileCount - webCount,
            });
          } else {
            identical.push(webItem);
          }
        }
      });

      // Check items only in file
      fileMap.forEach((fileItem, material) => {
        if (!websiteMap.has(material)) {
          onlyInFile.push(fileItem);
        }
      });

      setComparison({ onlyInWebsite, onlyInFile, differences, identical });
      setLoading(false);
    }, 100);
  };

  const handleDeleteItem = async (material: string) => {
    if (!confirm(`Are you sure you want to delete ${material} from the website?`)) {
      return;
    }

    try {
      const response = await fetch("/api/deleteInventoryItem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material }),
      });

      if (response.ok) {
        alert(`✅ Successfully deleted ${material}`);
        await loadWebsiteData();
        if (fileData.length > 0) {
          compareFiles();
        }
      } else {
        const data = await response.json();
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("❌ Error deleting item");
    }
  };

  const handleBulkDelete = async () => {
    if (bulkDeletePassword !== "admin123") {
      alert("❌ Incorrect password!");
      return;
    }

    if (!comparison || comparison.onlyInWebsite.length === 0) {
      return;
    }

    if (!confirm(`Are you sure you want to delete all ${comparison.onlyInWebsite.length} items that are only in the website?`)) {
      setShowBulkDeleteModal(false);
      setBulkDeletePassword("");
      return;
    }

    try {
      let successCount = 0;
      let failCount = 0;

      for (const item of comparison.onlyInWebsite) {
        try {
          const response = await fetch("/api/deleteInventoryItem", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ material: item.material }),
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      alert(`✅ Deleted ${successCount} items${failCount > 0 ? `, ${failCount} failed` : ''}`);
      setShowBulkDeleteModal(false);
      setBulkDeletePassword("");
      await loadWebsiteData();
      if (fileData.length > 0) {
        compareFiles();
      }
    } catch (error) {
      console.error("Bulk delete error:", error);
      alert("❌ Error during bulk delete");
    }
  };

  const handleUpdateItem = async (material: string, fileItem: any) => {
    if (!confirm(`Are you sure you want to update ${material} in the website?`)) {
      return;
    }

    try {
      const response = await fetch("/api/addInventoryBatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            material: material,
            actual_count: fileItem['Actual Counts'] || 0,
            location: fileItem['Location'] || "",
          }]
        }),
      });

      if (response.ok) {
        alert(`✅ Successfully updated ${material}`);
        await loadWebsiteData();
        if (fileData.length > 0) {
          compareFiles();
        }
      } else {
        const data = await response.json();
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("❌ Error updating item");
    }
  };

  const exportComparison = () => {
    if (!comparison) return;

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summary = [
      ["Comparison Summary"],
      ["File:", fileName],
      ["Website Data vs File Data"],
      [""],
      ["Category", "Count"],
      ["Only in Website", comparison.onlyInWebsite.length],
      ["Only in File", comparison.onlyInFile.length],
      ["Differences", comparison.differences.length],
      ["Identical", comparison.identical.length],
      ["Total in Website", websiteData.length],
      ["Total in File", fileData.length],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    // Only in Website
    if (comparison.onlyInWebsite.length > 0) {
      const ws1 = XLSX.utils.json_to_sheet(comparison.onlyInWebsite);
      XLSX.utils.book_append_sheet(wb, ws1, "Only in Website");
    }

    // Only in File
    if (comparison.onlyInFile.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(comparison.onlyInFile);
      XLSX.utils.book_append_sheet(wb, ws2, "Only in File");
    }

    // Differences
    if (comparison.differences.length > 0) {
      const diffData = comparison.differences.map((d: any) => ({
        Material: d.material,
        "Website Count": d.website.actual_count,
        "File Count": d.file["Actual Counts"],
        Difference: d.countDiff,
        "Website Location": d.website.location,
        "File Location": d.file.Location,
      }));
      const ws3 = XLSX.utils.json_to_sheet(diffData);
      XLSX.utils.book_append_sheet(wb, ws3, "Differences");
    }

    XLSX.writeFile(
      wb,
      `Comparison_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const handleExportInventory = async () => {
    setIsExporting(true);

    try {
      const response = await fetch("/api/exportInventory");

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        
        const contentDisposition = response.headers.get("Content-Disposition");
        const filename = contentDisposition
          ? contentDisposition.split("filename=")[1].replace(/"/g, "")
          : `inventory-export-${new Date().toISOString().split('T')[0]}.xlsx`;
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        alert("✅ Export successful!");
      } else {
        const data = await response.json();
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("❌ Error: Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-2 mb-6">
          <a
            href="/"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-semibold"
          >
            ← Home
          </a>
          {isAdmin && (
            <>
              <a
                href="/view"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
              >
                📊 View Records
              </a>
              <a
                href="/manage"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
              >
                🗂️ Manage
              </a>
              <a
                href="/admin"
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-semibold"
              >
                👥 Users
              </a>
            </>
          )}
        </div>

        <h1 className="text-3xl font-bold mb-6">📊 Compare File with Website Data</h1>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="mb-4">
            <label className="block mb-2 font-semibold text-gray-700">
              📄 Upload File to Compare (Website data loads automatically)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls,.xlsm"
              onChange={handleFileUpload}
              className="w-full border-2 border-gray-300 p-3 rounded-lg hover:border-blue-400 focus:border-blue-500 transition"
            />
            {fileName && (
              <p className="mt-2 text-sm text-green-600">
                ✓ {fileName} ({fileData.length} items) vs Website ({websiteData.length} items)
              </p>
            )}
            {!websiteData.length && (
              <p className="mt-2 text-sm text-orange-600">
                ⚠️ Loading website data...
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={compareFiles}
              disabled={!fileData.length || !websiteData.length || loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {loading ? "⏳ Processing..." : "🔍 Compare with Website"}
            </button>

            {comparison && (
              <button
                onClick={exportComparison}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2"
              >
                📥 Export Comparison
              </button>
            )}
            
            <button
              onClick={handleExportInventory}
              disabled={isExporting}
              className="ml-auto bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {isExporting ? "⏳ Exporting..." : "📥 Export Current Inventory"}
            </button>
          </div>
        </div>

        {comparison && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-red-50 border-2 border-red-200 p-4 rounded-lg">
                <p className="text-red-600 font-semibold text-sm">
                  Only in Website
                </p>
                <p className="text-3xl font-bold text-red-700">
                  {comparison.onlyInWebsite.length}
                </p>
              </div>
              <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg">
                <p className="text-green-600 font-semibold text-sm">
                  Only in File
                </p>
                <p className="text-3xl font-bold text-green-700">
                  {comparison.onlyInFile.length}
                </p>
              </div>
              <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-lg">
                <p className="text-yellow-600 font-semibold text-sm">
                  Differences
                </p>
                <p className="text-3xl font-bold text-yellow-700">
                  {comparison.differences.length}
                </p>
              </div>
              <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
                <p className="text-blue-600 font-semibold text-sm">Identical</p>
                <p className="text-3xl font-bold text-blue-700">
                  {comparison.identical.length}
                </p>
              </div>
            </div>

            {/* Only in Website */}
            {comparison.onlyInWebsite.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-red-600">
                    ❌ Only in Website ({comparison.onlyInWebsite.length} items)
                  </h2>
                  {isAdmin && (
                    <button
                      onClick={() => setShowBulkDeleteModal(true)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition"
                    >
                      🗑️ Delete All (Requires Password)
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-red-100">
                      <tr>
                        <th className="border p-3 text-left">Material</th>
                        <th className="border p-3 text-left">Count</th>
                        <th className="border p-3 text-left">Location</th>
                        {isAdmin && <th className="border p-3 text-center">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.onlyInWebsite.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-red-50">
                          <td className="border p-3">{item.material}</td>
                          <td className="border p-3">{item.actual_count}</td>
                          <td className="border p-3">{item.location}</td>
                          {isAdmin && (
                            <td className="border p-3 text-center">
                              <button
                                onClick={() => handleDeleteItem(item.material)}
                                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Only in File */}
            {comparison.onlyInFile.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-green-600 mb-4">
                  ➕ Only in File ({comparison.onlyInFile.length} items) - New Items
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-green-100">
                      <tr>
                        <th className="border p-3 text-left">Material</th>
                        <th className="border p-3 text-left">Count</th>
                        <th className="border p-3 text-left">Location</th>
                        {isAdmin && <th className="border p-3 text-center">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.onlyInFile.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-green-50">
                          <td className="border p-3">{item.Material}</td>
                          <td className="border p-3">{item['Actual Counts']}</td>
                          <td className="border p-3">{item.Location}</td>
                          {isAdmin && (
                            <td className="border p-3 text-center">
                              <button
                                onClick={() => handleUpdateItem(item.Material, item)}
                                className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
                              >
                                Add to Website
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Differences */}
            {comparison.differences.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-yellow-600 mb-4">
                  ⚠️ Differences ({comparison.differences.length} items)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-yellow-100">
                      <tr>
                        <th className="border p-3 text-left">Material</th>
                        <th className="border p-3 text-left">Website Count</th>
                        <th className="border p-3 text-left">File Count</th>
                        <th className="border p-3 text-left">Difference</th>
                        <th className="border p-3 text-left">Website Location</th>
                        <th className="border p-3 text-left">File Location</th>
                        {isAdmin && <th className="border p-3 text-center">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.differences.map((diff: any, i: number) => (
                        <tr key={i} className="hover:bg-yellow-50">
                          <td className="border p-3">{diff.material}</td>
                          <td className="border p-3">
                            {diff.website.actual_count}
                          </td>
                          <td className="border p-3">
                            {diff.file['Actual Counts']}
                          </td>
                          <td
                            className={`border p-3 font-bold ${
                              diff.countDiff > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {diff.countDiff > 0 ? "+" : ""}
                            {diff.countDiff}
                          </td>
                          <td className="border p-3">{diff.website.location}</td>
                          <td className="border p-3">{diff.file.Location}</td>
                          {isAdmin && (
                            <td className="border p-3 text-center">
                              <button
                                onClick={() => handleUpdateItem(diff.material, diff.file)}
                                className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm"
                              >
                                Update Website
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bulk Delete Modal */}
        {showBulkDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">🔒 Enter Password to Delete All</h3>
              <p className="mb-4 text-gray-600">
                This will delete all {comparison?.onlyInWebsite.length} items that are only in the website.
              </p>
              <input
                type="password"
                value={bulkDeletePassword}
                onChange={(e) => setBulkDeletePassword(e.target.value)}
                placeholder="Enter password"
                className="w-full border-2 border-gray-300 p-3 rounded-lg mb-4"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleBulkDelete();
                  }
                }}
              />
              <div className="flex gap-4">
                <button
                  onClick={handleBulkDelete}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
                >
                  Delete All
                </button>
                <button
                  onClick={() => {
                    setShowBulkDeleteModal(false);
                    setBulkDeletePassword("");
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
