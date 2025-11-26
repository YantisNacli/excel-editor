"use client";

import { useState } from "react";

type BatchItem = {
  material: string;
  actual_count: number;
  location: string;
};

export default function ManagePage() {
  const [mode, setMode] = useState<"add" | "check">("add");
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [currentMaterial, setCurrentMaterial] = useState("");
  const [currentCount, setCurrentCount] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checkResult, setCheckResult] = useState<{ material: string; actual_count: number; location: string } | null>(null);

  const handleAddToBatch = () => {
    if (!currentMaterial.trim() || !currentLocation.trim()) {
      setError("Please enter material and location");
      return;
    }

    const count = parseInt(currentCount) || 0;

    setBatchItems([...batchItems, {
      material: currentMaterial.trim(),
      actual_count: count,
      location: currentLocation.trim()
    }]);

    setCurrentMaterial("");
    setCurrentCount("");
    setCurrentLocation("");
    setError("");
    setMessage(`✅ Added ${currentMaterial} to batch`);
    setTimeout(() => setMessage(""), 2000);
  };

  const handleRemoveFromBatch = (index: number) => {
    setBatchItems(batchItems.filter((_, i) => i !== index));
  };

  const handleSubmitBatch = async () => {
    if (batchItems.length === 0) return;

    setIsProcessing(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/addInventoryBatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: batchItems }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Successfully added ${data.added} items to inventory`);
        setBatchItems([]);
      } else {
        setError(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setError("❌ Failed to add items. Please try again.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckPart = async () => {
    if (!currentMaterial.trim()) {
      setError("Please enter a material/part number");
      return;
    }

    setIsProcessing(true);
    setError("");
    setCheckResult(null);

    try {
      const response = await fetch("/api/checkInventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material: currentMaterial }),
      });

      const data = await response.json();

      if (response.ok) {
        setCheckResult(data);
        setError("");
      } else {
        setError(`❌ ${data.error || "Part not found"}`);
        setCheckResult(null);
      }
    } catch (err) {
      setError("❌ Failed to check part. Please try again.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <a
              href="/view"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-semibold"
            >
              ← Back to View
            </a>
            <h1 className="text-2xl font-bold text-gray-900">Manage Inventory</h1>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => { setMode("add"); setError(""); setCheckResult(null); }}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              mode === "add"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            ➕ Add New Parts
          </button>
          <button
            onClick={() => { setMode("check"); setError(""); setMessage(""); }}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              mode === "check"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            🔍 Check Existing Parts
          </button>
        </div>

        {/* Add Mode */}
        {mode === "add" && (
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Add New Parts to Inventory</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material/Part Number *
                </label>
                <input
                  type="text"
                  value={currentMaterial}
                  onChange={(e) => setCurrentMaterial(e.target.value)}
                  placeholder="e.g., MM01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Count
                </label>
                <input
                  type="number"
                  value={currentCount}
                  onChange={(e) => setCurrentCount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location *
                </label>
                <input
                  type="text"
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  placeholder="e.g., Shelf A1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleAddToBatch}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold mb-6"
            >
              Add to Batch
            </button>

            {batchItems.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Batch List ({batchItems.length} items)
                </h3>
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {batchItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border border-gray-200">
                      <div className="flex-1">
                        <span className="font-semibold text-gray-900">{item.material}</span>
                        <span className="text-gray-600 mx-2">•</span>
                        <span className="text-gray-700">Count: {item.actual_count}</span>
                        <span className="text-gray-600 mx-2">•</span>
                        <span className="text-gray-700">Location: {item.location}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveFromBatch(idx)}
                        className="ml-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSubmitBatch}
                  disabled={isProcessing}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-bold"
                >
                  {isProcessing ? "Processing..." : `Submit ${batchItems.length} Items`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Check Mode */}
        {mode === "check" && (
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Check Existing Parts</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material/Part Number
              </label>
              <input
                type="text"
                value={currentMaterial}
                onChange={(e) => setCurrentMaterial(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && currentMaterial.trim() && !isProcessing) {
                    handleCheckPart();
                  }
                }}
                placeholder="Enter part number to check"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
            </div>

            <button
              onClick={handleCheckPart}
              disabled={isProcessing || !currentMaterial.trim()}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-bold mb-4"
            >
              {isProcessing ? "Checking..." : "Check Part"}
            </button>

            {checkResult && (
              <div className="mt-6 p-6 bg-white rounded-lg border-2 border-green-500">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Part Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Material:</span>
                    <p className="text-xl font-bold text-gray-900">{checkResult.material}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Actual Count:</span>
                    <p className="text-2xl font-bold text-blue-600">{checkResult.actual_count}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Location:</span>
                    <p className="text-2xl font-bold text-green-600">{checkResult.location || "Not specified"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {message && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">{message}</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
