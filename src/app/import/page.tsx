"use client";

import { useState } from "react";

export default function ImportPage() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple password check - you can change this password
    if (password === "admin123") {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("❌ Incorrect password");
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError("❌ Please select a file first");
      return;
    }

    setUploading(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/uploadExcel", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ File uploaded successfully: ${data.fileName}`);
        setSelectedFile(null);
      } else {
        setError(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setError("❌ Failed to upload file. Please try again.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">🔒 Admin Access Required</h1>
          <form onSubmit={handlePasswordSubmit}>
            <label className="block mb-2 font-semibold text-gray-700">Enter Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Access Import Page
            </button>
          </form>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          <div className="mt-6 text-center">
            <a href="/" className="text-blue-600 hover:text-blue-800 underline text-sm">
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Import Inventory Data</h1>
        <p className="text-gray-600 mb-6">
          Upload Excel file and import Material, Actual Count, and Location data.
        </p>

        {/* Upload Section */}
        <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📤 Step 1: Upload Excel File</h2>
          <div className="mb-4">
            <input
              type="file"
              accept=".xlsx,.xlsm,.xls"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <button
            onClick={handleFileUpload}
            disabled={!selectedFile || uploading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            {uploading ? "Uploading..." : "Upload File to Storage"}
          </button>
        </div>

        {/* Import Section */}
        <div className="p-6 bg-blue-50 rounded-lg border border-blue-200 mb-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">📥 Step 2: Import Data to Database</h2>
          <p className="text-blue-800 text-sm mb-4">
            After uploading the file, click below to import the data into the database.
            The file should have a "Master Data" sheet with Material, Actual Count, and Location columns.
          </p>
          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
          >
            {importing ? "Importing..." : "Import Inventory Data"}
          </button>
        </div>

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

        <div className="pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">⚠️ Important Notes:</h3>
          <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
            <li>Upload will replace the existing Excel file in storage</li>
            <li>Import will update existing records and add new ones to the database</li>
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
