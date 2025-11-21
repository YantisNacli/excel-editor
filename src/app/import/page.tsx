"use client";

import { useState } from "react";

export default function ImportPage() {
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleImport = async () => {
    setImporting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/importInventory", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Successfully imported ${data.imported} items from ${data.sheet}`);
      } else {
        setError(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setError("❌ Failed to import inventory. Please try again.");
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Import Inventory Data</h1>
        <p className="text-gray-600 mb-6">
          Import Material, Actual Count, and Location data from the Excel file in storage.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2">📋 Instructions:</h2>
          <ol className="list-decimal list-inside text-blue-800 space-y-1 text-sm">
            <li>Make sure the Excel file is uploaded to Supabase Storage</li>
            <li>File name: "Copy of Stock Inventory_29 Oct 2025.xlsm"</li>
            <li>The file should have a "Master Data" sheet with Material, Actual Count, and Location columns</li>
            <li>Click the button below to import all data into the database</li>
          </ol>
        </div>

        <button
          onClick={handleImport}
          disabled={importing}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
        >
          {importing ? "Importing..." : "Import Inventory Data"}
        </button>

        {message && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">{message}</p>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">⚠️ Important Notes:</h3>
          <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
            <li>This will replace all existing inventory data in the database</li>
            <li>The import process may take a few seconds for large files</li>
            <li>After importing, all searches and queries will use this data</li>
          </ul>
        </div>

        <div className="mt-6 flex gap-4">
          <a
            href="/"
            className="flex-1 text-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            ← Back to Home
          </a>
          <a
            href="/view"
            className="flex-1 text-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            View Records →
          </a>
        </div>
      </div>
    </div>
  );
}
