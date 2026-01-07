"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

type ComparisonResult = {
  onlyInFile1: any[];
  onlyInFile2: any[];
  differences: any[];
  identical: any[];
};

export default function ComparePage() {
  const [file1Data, setFile1Data] = useState<any[]>([]);
  const [file2Data, setFile2Data] = useState<any[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [file1Name, setFile1Name] = useState("");
  const [file2Name, setFile2Name] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [columnKeys, setColumnKeys] = useState({ material: 'Material', count: 'Actual Count', location: 'Location' });
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const userRole = localStorage.getItem('stockTrackerUserRole');
    setIsAdmin(userRole === 'admin');
  }, []);

  const handleFileUpload = async (e: any, fileNum: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: "binary" });
        
        // Look for "Master Data" sheet first, otherwise use first sheet
        let sheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes("master") || name.toLowerCase().includes("masterdata")
        ) || workbook.SheetNames[0];
        
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        // Normalize blank count values to 0
        const normalizedData = data.map((item: any) => {
          const normalized = { ...item };
          Object.keys(normalized).forEach(key => {
            if (key.toLowerCase().includes('count') || key.toLowerCase().includes('actual')) {
              if (normalized[key] === "" || normalized[key] === null || normalized[key] === undefined) {
                normalized[key] = 0;
              }
            }
          });
          return normalized;
        });

        if (fileNum === 1) {
          setFile1Data(normalizedData);
          setFile1Name(file.name);
        } else {
          setFile2Data(normalizedData);
          setFile2Name(file.name);
        }
      } catch (error) {
        alert("Error reading file. Please ensure it's a valid Excel file.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const compareFiles = () => {
    setLoading(true);

    setTimeout(() => {
      // Debug: Check what keys are in the data
      console.log("File 1 sample:", file1Data[0]);
      console.log("File 2 sample:", file2Data[0]);
      
      // Try to find the material column name (could be "Material", "material", or other variations)
      const getMaterialKey = (item: any) => {
        const keys = Object.keys(item);
        return keys.find(k => k.toLowerCase().includes('material')) || keys[0];
      };
      
      const getCountKey = (item: any) => {
        const keys = Object.keys(item);
        return keys.find(k => k.toLowerCase().includes('count') || k.toLowerCase().includes('actual')) || keys[1];
      };
      
      const getLocationKey = (item: any) => {
        const keys = Object.keys(item);
        return keys.find(k => k.toLowerCase().includes('location')) || keys[2];
      };
      
      const materialKey1 = file1Data.length > 0 ? getMaterialKey(file1Data[0]) : 'Material';
      const materialKey2 = file2Data.length > 0 ? getMaterialKey(file2Data[0]) : 'Material';
      const countKey1 = file1Data.length > 0 ? getCountKey(file1Data[0]) : 'Actual Count';
      const countKey2 = file2Data.length > 0 ? getCountKey(file2Data[0]) : 'Actual Count';
      const locationKey1 = file1Data.length > 0 ? getLocationKey(file1Data[0]) : 'Location';
      const locationKey2 = file2Data.length > 0 ? getLocationKey(file2Data[0]) : 'Location';
      
      // Store column keys for display
      setColumnKeys({ material: materialKey1, count: countKey1, location: locationKey1 });
      
      console.log("Using keys - File 1:", { materialKey1, countKey1, locationKey1 });
      console.log("Using keys - File 2:", { materialKey2, countKey2, locationKey2 });

      const map1 = new Map(file1Data.map((item: any) => [item[materialKey1], item]));
      const map2 = new Map(file2Data.map((item: any) => [item[materialKey2], item]));

      const onlyInFile1: any[] = [];
      const onlyInFile2: any[] = [];
      const differences: any[] = [];
      const identical: any[] = [];

      // Check items in file1
      map1.forEach((item1, material) => {
        if (!map2.has(material)) {
          onlyInFile1.push(item1);
        } else {
          const item2 = map2.get(material);
          const count1 = item1[countKey1] === "" || item1[countKey1] === null || item1[countKey1] === undefined ? 0 : item1[countKey1];
          const count2 = item2[countKey2] === "" || item2[countKey2] === null || item2[countKey2] === undefined ? 0 : item2[countKey2];
          
          if (
            count1 !== count2 ||
            item1[locationKey1] !== item2[locationKey2]
          ) {
            differences.push({
              material,
              file1: item1,
              file2: item2,
              countDiff: count2 - count1,
            });
          } else {
            identical.push(item1);
          }
        }
      });

      // Check items only in file2
      map2.forEach((item2, material) => {
        if (!map1.has(material)) {
          onlyInFile2.push(item2);
        }
      });

      setComparison({ onlyInFile1, onlyInFile2, differences, identical });
      setLoading(false);
    }, 100);
  };

  const exportComparison = () => {
    if (!comparison) return;

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summary = [
      ["Comparison Summary"],
      ["File 1:", file1Name],
      ["File 2:", file2Name],
      [""],
      ["Category", "Count"],
      ["Only in File 1", comparison.onlyInFile1.length],
      ["Only in File 2", comparison.onlyInFile2.length],
      ["Differences", comparison.differences.length],
      ["Identical", comparison.identical.length],
      ["Total in File 1", file1Data.length],
      ["Total in File 2", file2Data.length],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    // Only in File 1
    if (comparison.onlyInFile1.length > 0) {
      const ws1 = XLSX.utils.json_to_sheet(comparison.onlyInFile1);
      XLSX.utils.book_append_sheet(wb, ws1, "Only in File 1");
    }

    // Only in File 2
    if (comparison.onlyInFile2.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(comparison.onlyInFile2);
      XLSX.utils.book_append_sheet(wb, ws2, "Only in File 2");
    }

    // Differences
    if (comparison.differences.length > 0) {
      const diffData = comparison.differences.map((d: any) => ({
        Material: d.material,
        "File 1 Count": d.file1["Actual Count"],
        "File 2 Count": d.file2["Actual Count"],
        Difference: d.countDiff,
        "File 1 Location": d.file1.Location,
        "File 2 Location": d.file2.Location,
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

        <h1 className="text-3xl font-bold mb-6">📊 Compare Inventory Files</h1>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block mb-2 font-semibold text-gray-700">
                📄 File 1 (e.g., Current Export)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.xlsm"
                onChange={(e) => handleFileUpload(e, 1)}
                className="w-full border-2 border-gray-300 p-3 rounded-lg hover:border-blue-400 focus:border-blue-500 transition"
              />
              {file1Name && (
                <p className="mt-2 text-sm text-green-600">
                  ✓ {file1Name} ({file1Data.length} items)
                </p>
              )}
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-700">
                📄 File 2 (e.g., Updated Inventory)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.xlsm"
                onChange={(e) => handleFileUpload(e, 2)}
                className="w-full border-2 border-gray-300 p-3 rounded-lg hover:border-blue-400 focus:border-blue-500 transition"
              />
              {file2Name && (
                <p className="mt-2 text-sm text-green-600">
                  ✓ {file2Name} ({file2Data.length} items)
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={compareFiles}
              disabled={!file1Data.length || !file2Data.length || loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {loading ? "⏳ Processing..." : "🔍 Compare Files"}
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
                  Only in File 1
                </p>
                <p className="text-3xl font-bold text-red-700">
                  {comparison.onlyInFile1.length}
                </p>
              </div>
              <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg">
                <p className="text-green-600 font-semibold text-sm">
                  Only in File 2
                </p>
                <p className="text-3xl font-bold text-green-700">
                  {comparison.onlyInFile2.length}
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

            {/* Only in File 1 */}
            {comparison.onlyInFile1.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-red-600 mb-4">
                  ❌ Only in File 1 ({comparison.onlyInFile1.length} items)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-red-100">
                      <tr>
                        <th className="border p-3 text-left">Material</th>
                        <th className="border p-3 text-left">Count</th>
                        <th className="border p-3 text-left">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.onlyInFile1.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-red-50">
                          <td className="border p-3">{item[columnKeys.material]}</td>
                          <td className="border p-3">{item[columnKeys.count]}</td>
                          <td className="border p-3">{item[columnKeys.location]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Only in File 2 */}
            {comparison.onlyInFile2.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-green-600 mb-4">
                  ➕ Only in File 2 ({comparison.onlyInFile2.length} items)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-green-100">
                      <tr>
                        <th className="border p-3 text-left">Material</th>
                        <th className="border p-3 text-left">Count</th>
                        <th className="border p-3 text-left">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.onlyInFile2.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-green-50">
                          <td className="border p-3">{item[columnKeys.material]}</td>
                          <td className="border p-3">{item[columnKeys.count]}</td>
                          <td className="border p-3">{item[columnKeys.location]}</td>
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
                        <th className="border p-3 text-left">File 1 Count</th>
                        <th className="border p-3 text-left">File 2 Count</th>
                        <th className="border p-3 text-left">Difference</th>
                        <th className="border p-3 text-left">File 1 Location</th>
                        <th className="border p-3 text-left">File 2 Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.differences.map((diff: any, i: number) => (
                        <tr key={i} className="hover:bg-yellow-50">
                          <td className="border p-3">{diff.material}</td>
                          <td className="border p-3">
                            {diff.file1[columnKeys.count]}
                          </td>
                          <td className="border p-3">
                            {diff.file2[columnKeys.count]}
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
                          <td className="border p-3">{diff.file1[columnKeys.location]}</td>
                          <td className="border p-3">{diff.file2[columnKeys.location]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
