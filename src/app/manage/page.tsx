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
  const [checkBatchItems, setCheckBatchItems] = useState<Array<{ material: string; actual_count: number; location: string }>>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

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

  const searchPartNumbers = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch("/api/searchPartNumbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.matches || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMaterialChange = (value: string) => {
    setCurrentMaterial(value);
    if (mode === "check") {
      searchPartNumbers(value);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setCurrentMaterial(suggestion);
    setShowSuggestions(false);
  };

  const handleAddToCheckBatch = async () => {
    if (!currentMaterial.trim()) {
      setError("Please enter a material/part number");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const response = await fetch("/api/checkInventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material: currentMaterial }),
      });

      const data = await response.json();

      if (response.ok) {
        setCheckBatchItems([...checkBatchItems, data]);
        setCurrentMaterial("");
        setShowSuggestions(false);
        setMessage(`✅ Added ${data.material} to batch`);
        setTimeout(() => setMessage(""), 2000);
      } else {
        setError(`❌ ${data.error || "Part not found"}`);
      }
    } catch (err) {
      setError("❌ Failed to check part. Please try again.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveFromCheckBatch = (index: number) => {
    setCheckBatchItems(checkBatchItems.filter((_, i) => i !== index));
  };

  const handleClearCheckBatch = () => {
    setCheckBatchItems([]);
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
            onClick={() => { setMode("check"); setError(""); setMessage(""); setCheckBatchItems([]); }}
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
            
            <div className="mb-4 relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material/Part Number
              </label>
              <input
                type="text"
                value={currentMaterial}
                onChange={(e) => handleMaterialChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && currentMaterial.trim() && !isProcessing) {
                    handleAddToCheckBatch();
                  }
                }}
                placeholder="Type to search and add to batch"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
              
              {/* Autocomplete Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectSuggestion(suggestion);
                      }}
                      className="px-3 py-2 hover:bg-blue-100 cursor-pointer text-gray-900"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleAddToCheckBatch}
              disabled={isProcessing || !currentMaterial.trim()}
              className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 font-semibold mb-6"
            >
              {isProcessing ? "Loading..." : "Add to Batch"}
            </button>

            {checkBatchItems.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-900">
                    Parts in Batch ({checkBatchItems.length})
                  </h3>
                  <button
                    onClick={handleClearCheckBatch}
                    className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {checkBatchItems.map((item, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-lg border-2 border-green-500 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <p className="text-lg font-bold text-gray-900">{item.material}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveFromCheckBatch(idx)}
                          className="ml-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs font-medium text-gray-600">Actual Count:</span>
                          <p className="text-2xl font-bold text-blue-600">{item.actual_count}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-600">Location:</span>
                          <p className="text-xl font-bold text-green-600">{item.location || "Not specified"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
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
