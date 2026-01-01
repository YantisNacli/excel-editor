"use client";

import { useState, useEffect, useRef } from "react";
import { scanPartNumbersFromBlob, scanPartNumbersFromCanvas } from "../../lib/textScan";

type BatchItem = {
  material: string;
  actual_count: number;
  location: string;
};

export default function ManagePage() {
  const [mode, setMode] = useState<"add" | "check" | "delete">("add");
  const [userRole, setUserRole] = useState<string>("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [currentMaterial, setCurrentMaterial] = useState("");
  const [currentCount, setCurrentCount] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checkBatchItems, setCheckBatchItems] = useState<Array<{ material: string; actual_count: number; location: string }>>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateData, setDuplicateData] = useState<Array<{ material: string; newData: any; oldData: any }>>([]);
  const [pendingBatchItems, setPendingBatchItems] = useState<BatchItem[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ material: string; actual_count: number; location: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [scanResults, setScanResults] = useState<string[]>([]);
  const [scanError, setScanError] = useState<string>("");

  const handleAddToBatch = () => {
    if (!currentMaterial.trim() || !currentLocation.trim()) {
      setError("Please enter material and location");
      return;
    }

    const count = parseInt(currentCount) || 0;
    const normalizedMaterial = currentMaterial.trim().toUpperCase();

    setBatchItems([...batchItems, {
      material: normalizedMaterial,
      actual_count: count,
      location: currentLocation.trim()
    }]);

    setCurrentMaterial("");
    setCurrentCount("");
    setCurrentLocation("");
    setError("");
    setMessage(`✅ Added ${normalizedMaterial} to batch`);
    setTimeout(() => setMessage(""), 2000);
  };

  const handleRemoveFromBatch = (index: number) => {
    setBatchItems(batchItems.filter((_, i) => i !== index));
  };

  const handleAddToCheckBatch = async () => {
    if (!currentMaterial.trim()) {
      setError("Please enter a material/part number");
      return;
    }

    const normalizedMaterial = currentMaterial.trim().toUpperCase();

    setIsProcessing(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/checkInventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material: normalizedMaterial }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Part not found in inventory");
        return;
      }

      const nextItem = {
        material: normalizedMaterial,
        actual_count: data.actual_count ?? data.actualCount ?? 0,
        location: data.location || "Unknown",
      };

      setCheckBatchItems([...checkBatchItems, nextItem]);
      setCurrentMaterial("");
      setShowSuggestions(false);
      setMessage(`✅ Added ${normalizedMaterial} to check list`);
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setError("❌ Failed to check part. Please try again.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitBatch = async () => {
    if (batchItems.length === 0) return;

    setIsProcessing(true);
    setError("");
    setMessage("");

    try {
      // First, check for duplicates
      const checkResponse = await fetch("/api/checkDuplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: batchItems }),
      });

      const checkData = await checkResponse.json();

      if (checkResponse.ok && checkData.hasDuplicates) {
        // Show confirmation dialog
        setDuplicateData(checkData.duplicates);
        setPendingBatchItems(batchItems);
        setShowDuplicateDialog(true);
        setIsProcessing(false);
        return;
      }

      // No duplicates, proceed with normal add
      await submitBatchToDatabase(batchItems);
    } catch (err) {
      setError("❌ Failed to check items. Please try again.");
      console.error(err);
      setIsProcessing(false);
    }
  };

  const submitBatchToDatabase = async (items: BatchItem[]) => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/addInventoryBatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Successfully added/updated ${data.added} items to inventory`);
        setBatchItems([]);
        setPendingBatchItems([]);
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

  const handleConfirmReplace = async () => {
    setShowDuplicateDialog(false);
    await submitBatchToDatabase(pendingBatchItems);
  };

  const handleCancelReplace = () => {
    setShowDuplicateDialog(false);
    setDuplicateData([]);
    setPendingBatchItems([]);
    setIsProcessing(false);
    setMessage("❌ Operation cancelled. No changes made.");
  };

  const handleSearchForDelete = async () => {
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
        setDeleteConfirmation(data);
        setCurrentMaterial("");
        setShowSuggestions(false);
      } else {
        setError(`❌ ${data.error || "Part not found"}`);
      }
    } catch (err) {
      setError("❌ Failed to search for part. Please try again.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;

    setIsProcessing(true);
    setError("");

    try {
      const response = await fetch("/api/deleteInventoryItem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material: deleteConfirmation.material }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Successfully deleted ${deleteConfirmation.material}`);
        setDeleteConfirmation(null);
      } else {
        setError(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setError("❌ Failed to delete item. Please try again.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmation(null);
    setMessage("❌ Deletion cancelled.");
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

  const validatePartNumbers = async (partNumbers: string[]): Promise<string[]> => {
    if (partNumbers.length === 0) return [];
    const allVariations: string[] = [];
    partNumbers.forEach(partNum => {
      allVariations.push(partNum);
      const variations = [
        partNum.replace(/8/g, 'B'), partNum.replace(/B/g, '8'),
        partNum.replace(/0/g, 'O'), partNum.replace(/O/g, '0'),
        partNum.replace(/1/g, 'I'), partNum.replace(/I/g, '1'),
        partNum.replace(/5/g, 'S'), partNum.replace(/S/g, '5'),
      ];
      allVariations.push(...variations);
    });
    const uniqueVariations = [...new Set(allVariations)];
    try {
      const res = await fetch("/api/validatePartNumbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partNumbers: uniqueVariations }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.validPartNumbers || [];
      }
    } catch (error) {
      console.error("Error validating part numbers:", error);
    }
    return [];
  };

  // Text scanning (camera + upload) for check mode
  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    setScanError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Camera error", err);
      setScanError("Unable to access camera. Please check permissions or use Upload.");
    }
  };

  const applyScanResults = (tokens: string[]) => {
    setScanResults(tokens);
    if (tokens.length > 0) {
      setCurrentMaterial(tokens[0]);
      setScanError("");
    } else {
      setScanError("No clear text found. Try a closer photo or better lighting.");
    }
  };

  const captureFromCamera = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvasRef.current = canvas;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    setIsScanningImage(true);
    try {
      const tokens = await scanPartNumbersFromCanvas(canvas);
      applyScanResults(tokens);
    } catch (err) {
      console.error("Scan error", err);
      setScanError("Scan failed. Please try again.");
    } finally {
      setIsScanningImage(false);
    }
  };

  const handleCheckImageUpload = async (file: File | null) => {
    if (!file) return;
    setIsScanningImage(true);
    setScanError("");
    try {
      const tokens = await scanPartNumbersFromBlob(file);
      applyScanResults(tokens);
    } catch (err) {
      console.error("Upload scan error", err);
      setScanError("Could not read that image. Try a clearer photo.");
    } finally {
      setIsScanningImage(false);
    }
  };

  const openScanModal = () => {
    setScanResults([]);
    setScanError("");
    setIsScanModalOpen(true);
  };

  const closeScanModal = () => {
    stopCamera();
    setIsScanModalOpen(false);
  };

  useEffect(() => {
    // Check user role from localStorage
    const role = localStorage.getItem('stockTrackerUserRole');
    setUserRole(role || "");
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!userRole || !["operator", "admin"].includes(userRole)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-gray-300 rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-4">🚫 Access Denied</h1>
          <p className="text-red-800 mb-6">
            You need operator or admin privileges to manage inventory.
          </p>
          <div className="flex gap-4">
            <a
              href="/"
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold text-center"
            >
              ← Go Home
            </a>
            <a
              href="/view"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-center"
            >
              View Records
            </a>
          </div>
        </div>
      </div>
    );
  }

  const handleRemoveFromCheckBatch = (index: number) => {
    setCheckBatchItems(checkBatchItems.filter((_, i) => i !== index));
  };

  const handleClearCheckBatch = () => {
    setCheckBatchItems([]);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (userRole !== "admin" && userRole !== "operator") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-4">🚫 Access Denied</h1>
          <p className="text-red-800 mb-6">
            You need operator or admin privileges to manage inventory.
          </p>
          <div className="flex gap-4">
            <a
              href="/"
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold text-center"
            >
              ← Go Home
            </a>
            <a
              href="/view"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-center"
            >
              View Records
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-2 mb-6">
          <a href="/" className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-semibold">
            ← Home
          </a>
          <a href="/view" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold">
            📊 View Records
          </a>
          <a href="/import" className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 font-semibold">
            📤 Import
          </a>
          <a href="/admin" className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-semibold">
            👥 Users
          </a>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">🗂️ Manage Inventory</h1>

        {/* Mode Toggle */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => { setMode("add"); setError(""); setDeleteConfirmation(null); }}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              mode === "add"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            ➕ Add New Parts
          </button>
          <button
            onClick={() => { setMode("check"); setError(""); setMessage(""); setCheckBatchItems([]); setDeleteConfirmation(null); }}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              mode === "check"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            🔍 Check Existing Parts
          </button>
          <button
            onClick={() => { setMode("delete"); setError(""); setMessage(""); setCheckBatchItems([]); setDeleteConfirmation(null); }}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              mode === "delete"
                ? "bg-red-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            🗑️ Delete Parts
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
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => { openScanModal(); startCamera(); }}
                  className="flex-1 px-3 py-2 bg-green-700 text-white rounded font-semibold hover:bg-green-800"
                >
                  Scan with Camera
                </button>
                <label className="flex-1">
                  <span className="block w-full px-3 py-2 bg-gray-200 text-gray-800 text-center rounded font-semibold hover:bg-gray-300 cursor-pointer">
                    Upload Image
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      handleCheckImageUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {scanResults.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                  <p className="font-semibold text-sm text-green-900 mb-2">Tap a scanned part number:</p>
                  <div className="flex flex-wrap gap-2">
                    {scanResults.slice(0, 6).map((token) => (
                      <button
                        key={token}
                        onClick={() => { setCurrentMaterial(token); setShowSuggestions(false); closeScanModal(); }}
                        className="px-3 py-1 bg-white border border-green-200 rounded hover:bg-green-100 text-sm font-semibold"
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {scanError && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  {scanError}
                </div>
              )}
              
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

        {/* Delete Mode */}
        {mode === "delete" && (
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Delete Parts from Inventory</h2>
            <p className="text-sm text-red-600 mb-4">
              ⚠️ Warning: This will permanently delete the part from the inventory database.
            </p>
            
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
                    handleSearchForDelete();
                  }
                }}
                placeholder="Search part to delete"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
              onClick={handleSearchForDelete}
              disabled={isProcessing || !currentMaterial.trim()}
              className="w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 font-semibold mb-6"
            >
              {isProcessing ? "Searching..." : "Search to Delete"}
            </button>

            {deleteConfirmation && (
              <div className="bg-white p-4 rounded-lg border-2 border-red-500 shadow-sm">
                <h3 className="text-lg font-bold text-red-900 mb-4">Confirm Deletion</h3>
                <div className="mb-4">
                  <p className="text-xl font-bold text-gray-900 mb-2">{deleteConfirmation.material}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Actual Count:</span>
                      <p className="text-lg font-bold text-blue-600">{deleteConfirmation.actual_count}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Location:</span>
                      <p className="text-lg font-bold text-green-600">{deleteConfirmation.location || "Not specified"}</p>
                    </div>
                  </div>
                </div>
                <p className="text-red-700 text-sm mb-4">
                  Are you sure you want to delete this part? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelDelete}
                    className="flex-1 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isProcessing}
                    className="flex-1 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 font-semibold"
                  >
                    {isProcessing ? "Deleting..." : "Confirm Delete"}
                  </button>
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

        {/* Duplicate Confirmation Dialog */}
        {showDuplicateDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">⚠️ Duplicate Items Found</h2>
                <p className="text-gray-700 mb-4">
                  The following items already exist in the inventory. Do you want to replace the old data with the new data?
                </p>
                
                <div className="space-y-4 mb-6">
                  {duplicateData.map((dup, idx) => (
                    <div key={idx} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-900 mb-3">{dup.material}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Old Data */}
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <h4 className="font-semibold text-red-900 mb-2">Current Data (Old)</h4>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Count:</span> {dup.oldData.actual_count}
                          </p>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Location:</span> {dup.oldData.location || "N/A"}
                          </p>
                        </div>
                        
                        {/* New Data */}
                        <div className="bg-green-50 border border-green-200 rounded p-3">
                          <h4 className="font-semibold text-green-900 mb-2">New Data</h4>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Count:</span> {dup.newData.actual_count}
                          </p>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Location:</span> {dup.newData.location || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleCancelReplace}
                    className="flex-1 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-bold"
                  >
                    ❌ No, Keep Old Data
                  </button>
                  <button
                    onClick={handleConfirmReplace}
                    className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
                  >
                    ✅ Yes, Replace with New Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isScanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-gray-900">Text Scan</h3>
                <button onClick={closeScanModal} className="text-gray-600 hover:text-gray-800 font-semibold">✕</button>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg overflow-hidden border border-gray-200 bg-black/5">
                  <video ref={videoRef} className="w-full h-64 bg-black" autoPlay muted playsInline />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={startCamera}
                    className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded font-semibold hover:bg-gray-300"
                  >
                    Enable Camera
                  </button>
                  <button
                    onClick={captureFromCamera}
                    disabled={!isCameraActive || isScanningImage}
                    className="flex-1 px-3 py-2 bg-green-700 text-white rounded font-semibold disabled:bg-gray-400"
                  >
                    {isScanningImage ? "Scanning..." : "Capture & Scan"}
                  </button>
                  <button
                    onClick={closeScanModal}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
                <p className="text-sm text-gray-600">Tip: Hold the label close, ensure good light, and keep text horizontal.</p>
                {scanResults.length > 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="font-semibold text-sm text-green-900 mb-2">Detected:</p>
                    <div className="flex flex-wrap gap-2">
                      {scanResults.slice(0, 8).map((token) => (
                        <button
                          key={token}
                          onClick={() => { setCurrentMaterial(token); setShowSuggestions(false); closeScanModal(); }}
                          className="px-3 py-1 bg-white border border-green-200 rounded hover:bg-green-100 text-sm font-semibold"
                        >
                          {token}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {scanError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">{scanError}</div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="check-upload-hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    handleCheckImageUpload(file);
                    e.target.value = "";
                  }}
                />
                <label htmlFor="check-upload-hidden" className="block w-full">
                  <span className="block w-full text-center px-3 py-2 bg-gray-200 text-gray-800 rounded font-semibold hover:bg-gray-300 cursor-pointer">
                    Or Upload Image Instead
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
